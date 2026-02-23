package kr.co.devsign.devsign_backend.service;

import jakarta.transaction.Transactional;
import kr.co.devsign.devsign_backend.dto.admin.AccessLogResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminMemberResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPasswordVerifyRequest;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodSaveRequest;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodSubmissionResponse;
import kr.co.devsign.devsign_backend.dto.admin.AdminPeriodZipRequest;
import kr.co.devsign.devsign_backend.dto.admin.HeroSettingsRequest;
import kr.co.devsign.devsign_backend.dto.admin.HeroSettingsResponse;
import kr.co.devsign.devsign_backend.dto.admin.RestoreMemberRequest;
import kr.co.devsign.devsign_backend.dto.admin.SyncDiscordResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.AccessLogRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyPeriodRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int[] ACTIVE_MONTHS = new int[]{3, 4, 5, 6, 9, 10, 11, 12};
    private static final String SUBMITTED = "SUBMITTED";

    private final MemberRepository memberRepository;
    private final AccessLogRepository accessLogRepository;
    private final AssemblyPeriodRepository assemblyPeriodRepository;
    private final AssemblyReportRepository assemblyReportRepository;
    private final AccessLogService accessLogService;
    private final DiscordBotClient discordBotClient;
    private final BCryptPasswordEncoder passwordEncoder;
    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    private static final Map<String, String> heroSettings = new ConcurrentHashMap<>();

    static {
        heroSettings.put("recruitmentText", "2026 recruitment open");
        heroSettings.put("applyLink", "https://open.kakao.com/o/example");
    }

    public List<AdminMemberResponse> getAllMembers() {
        return memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .map(this::toAdminMemberResponse)
                .toList();
    }

    public List<AdminMemberResponse> getDeletedMembers() {
        return memberRepository.findByDeletedTrueOrderByDeletedAtDesc().stream()
                .map(this::toAdminMemberResponse)
                .toList();
    }

    public List<AccessLogResponse> getAllLogs() {
        return accessLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(log -> new AccessLogResponse(
                        log.getId(),
                        log.getName(),
                        log.getStudentId(),
                        log.getType(),
                        log.getIp(),
                        log.getTimestamp()
                ))
                .toList();
    }

    public HeroSettingsResponse getHeroSettings() {
        return new HeroSettingsResponse(heroSettings.get("recruitmentText"), heroSettings.get("applyLink"));
    }

    public StatusResponse updateHeroSettings(HeroSettingsRequest settings) {
        heroSettings.put("recruitmentText", settings.recruitmentText());
        heroSettings.put("applyLink", settings.applyLink());
        return StatusResponse.success();
    }

    public List<AdminPeriodResponse> getPeriods(int year) {
        List<AssemblyPeriod> savedPeriods = assemblyPeriodRepository.findByYearOrderByMonthAsc(year);
        Map<Integer, AssemblyPeriod> periodByMonth = savedPeriods.stream()
                .collect(java.util.stream.Collectors.toMap(AssemblyPeriod::getMonth, p -> p, (a, b) -> a));

        long totalCount = memberRepository.countByDeletedFalse();

        return java.util.Arrays.stream(ACTIVE_MONTHS)
                .mapToObj(month -> {
                    int semester = month <= 6 ? 1 : 2;
                    AssemblyPeriod period = periodByMonth.get(month);

                    String type = period != null && StringUtils.hasText(period.getType())
                            ? period.getType()
                            : resolveType(month);

                    LocalDate startDate = period != null && period.getStartDate() != null
                            ? period.getStartDate()
                            : LocalDate.of(year, month, 1);

                    LocalDate endDate = period != null && period.getEndDate() != null
                            ? period.getEndDate()
                            : LocalDate.of(year, month, 28);

                    long submittedCount = assemblyReportRepository
                            .countByYearAndSemesterAndMonthAndStatus(year, semester, month, SUBMITTED);

                    return new AdminPeriodResponse(
                            period != null ? period.getId() : null,
                            month,
                            year,
                            semester,
                            type,
                            startDate.toString(),
                            endDate.toString(),
                            submittedCount,
                            totalCount
                    );
                })
                .toList();
    }

    @Transactional
    public StatusResponse saveAllPeriods(List<AdminPeriodSaveRequest> periods) {
        if (periods == null || periods.isEmpty()) {
            return StatusResponse.fail("period list is empty");
        }

        try {
            for (AdminPeriodSaveRequest request : periods) {
                if (request.year() == null || request.semester() == null || request.month() == null) {
                    return StatusResponse.fail("year, semester, month are required");
                }
                if (!StringUtils.hasText(request.startDate()) || !StringUtils.hasText(request.endDate())) {
                    return StatusResponse.fail("startDate and endDate are required");
                }

                LocalDate startDate = LocalDate.parse(request.startDate());
                LocalDate endDate = LocalDate.parse(request.endDate());
                if (endDate.isBefore(startDate)) {
                    return StatusResponse.fail("endDate must be on or after startDate");
                }

                AssemblyPeriod period = assemblyPeriodRepository
                        .findByYearAndSemesterAndMonth(request.year(), request.semester(), request.month())
                        .orElseGet(AssemblyPeriod::new);

                period.setYear(request.year());
                period.setSemester(request.semester());
                period.setMonth(request.month());
                period.setType(StringUtils.hasText(request.type()) ? request.type() : resolveType(request.month()));
                period.setStartDate(startDate);
                period.setEndDate(endDate);
                assemblyPeriodRepository.save(period);
            }
            return StatusResponse.success();
        } catch (Exception e) {
            return StatusResponse.fail("save periods failed: " + e.getMessage());
        }
    }

    public List<AdminPeriodSubmissionResponse> getSubmittedMembers(int year, int semester, int month) {
        List<AssemblyReport> reports = assemblyReportRepository
                .findByYearAndSemesterAndMonthAndStatusOrderByIdDesc(year, semester, month, SUBMITTED);

        return reports.stream()
                .map(report -> {
                    Optional<Member> member = memberRepository.findByLoginId(report.getLoginId());
                    String name = member.map(Member::getName).orElse(report.getLoginId());
                    String studentId = member.map(Member::getStudentId).orElse("");
                    return new AdminPeriodSubmissionResponse(
                            report.getLoginId(),
                            name,
                            studentId,
                            report.getDate(),
                            report.getPresentationPath(),
                            report.getPdfPath(),
                            report.getOtherPath(),
                            report.getMemo()
                    );
                })
                .toList();
    }

    public ResponseEntity<byte[]> downloadPeriodZip(AdminPeriodZipRequest request) {
        if (request == null || request.year() == null || request.month() == null
                || request.userIds() == null || request.userIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String fileType = normalizeFileType(request.fileType());
        List<AssemblyReport> reports = assemblyReportRepository.findByLoginIdInAndYearAndMonthAndStatus(
                request.userIds(),
                request.year(),
                request.month(),
                SUBMITTED
        );

        try (ByteArrayOutputStream buffer = new ByteArrayOutputStream();
             ZipOutputStream zipOut = new ZipOutputStream(buffer)) {

            for (AssemblyReport report : reports) {
                boolean includePresentation = "all".equals(fileType) || "ppt".equals(fileType);
                boolean includePdf = "all".equals(fileType) || "pdf".equals(fileType);
                boolean includeOther = "all".equals(fileType);

                addFileToZip(
                        zipOut,
                        report.getLoginId(),
                        "presentation",
                        report.getPresentationPath(),
                        includePresentation,
                        Set.of("ppt", "pptx")
                );
                addFileToZip(
                        zipOut,
                        report.getLoginId(),
                        "pdf",
                        report.getPdfPath(),
                        includePdf,
                        Set.of("pdf")
                );
                addFileToZip(
                        zipOut,
                        report.getLoginId(),
                        "other",
                        report.getOtherPath(),
                        includeOther,
                        Collections.emptySet()
                );
            }

            zipOut.finish();

            String fileName = String.format("assembly_%d_%02d_%s.zip", request.year(), request.month(), fileType);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .body(buffer.toByteArray());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    public SyncDiscordResponse syncDiscord() {
        try {
            Map<String, Object> botRes = discordBotClient.syncAllMembers();

            if (botRes != null && "success".equals(botRes.get("status"))) {
                List<Map<String, String>> discordMembers =
                        (List<Map<String, String>>) botRes.get("members");

                int updateCount = 0;

                for (Map<String, String> d : discordMembers) {
                    String tag = d.get("discordTag");

                    Optional<Member> opt = memberRepository.findByDiscordTag(tag);
                    if (opt.isPresent()) {
                        Member m = opt.get();
                        m.setName(d.get("name"));
                        m.setStudentId(d.get("studentId"));
                        m.setUserStatus(d.get("userStatus"));
                        m.setRole(d.get("role"));
                        m.setProfileImage(d.get("avatarUrl"));
                        memberRepository.save(m);
                        updateCount++;
                    }
                }

                return new SyncDiscordResponse("success", updateCount + " members synchronized");
            }

            return new SyncDiscordResponse("fail", "failed to receive data from bot server");

        } catch (Exception e) {
            return new SyncDiscordResponse("error", "sync error: " + e.getMessage());
        }
    }

    public StatusResponse toggleSuspension(Long id, String ip) {
        return memberRepository.findById(id)
                .map(m -> {
                    m.setSuspended(!m.isSuspended());
                    memberRepository.save(m);

                    accessLogService.logByMember(
                            m,
                            m.isSuspended() ? "ACCOUNT_SUSPEND" : "ACCOUNT_UNSUSPEND",
                            ip
                    );
                    return StatusResponse.success();
                })
                .orElseGet(() -> StatusResponse.fail("member not found"));
    }

    public StatusResponse restoreMember(RestoreMemberRequest request, String ip) {
        try {
            if (request == null) {
                return StatusResponse.fail("request is required");
            }

            Optional<Member> deletedMemberOpt = Optional.empty();
            if (request.id() != null) {
                deletedMemberOpt = memberRepository.findByIdAndDeletedTrue(request.id());
            }
            if (deletedMemberOpt.isEmpty() && StringUtils.hasText(request.loginId())) {
                deletedMemberOpt = memberRepository.findByLoginIdAndDeletedTrue(request.loginId());
            }
            if (deletedMemberOpt.isEmpty()) {
                return StatusResponse.fail("deleted member not found");
            }

            Member member = deletedMemberOpt.get();
            member.setDeleted(false);
            member.setDeletedAt(null);
            memberRepository.save(member);

            accessLogService.logByMember(member, "ACCOUNT_RESTORE", ip);
            return StatusResponse.success();

        } catch (Exception e) {
            return StatusResponse.fail("restore failed: " + e.getMessage());
        }
    }

    public StatusResponse deleteMember(Long id, boolean hard, String ip) {
        return memberRepository.findById(id)
                .map(m -> {
                    accessLogService.logByMember(
                            m,
                            hard ? "ACCOUNT_PERMANENT_DELETE" : "ACCOUNT_DELETE",
                            ip
                    );

                    if (hard) {
                        memberRepository.deleteById(id);
                    } else {
                        m.setDeleted(true);
                        m.setDeletedAt(LocalDateTime.now());
                        memberRepository.save(m);
                    }
                    return StatusResponse.success();
                })
                .orElseGet(() -> StatusResponse.fail("member not found"));
    }

    public StatusResponse verifyAdminPassword(Authentication authentication, AdminPasswordVerifyRequest request) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return StatusResponse.fail("unauthorized");
        }
        if (request == null || !StringUtils.hasText(request.password())) {
            return StatusResponse.fail("password is required");
        }

        String loginId = authentication.getName();
        return memberRepository.findByLoginId(loginId)
                .map(member -> passwordEncoder.matches(request.password(), member.getPassword())
                        ? StatusResponse.success()
                        : StatusResponse.fail("password mismatch"))
                .orElseGet(() -> StatusResponse.fail("member not found"));
    }

    private String resolveType(int month) {
        if (month == 3 || month == 9) {
            return "PLAN";
        }
        if (month == 6 || month == 12) {
            return "RESULT";
        }
        return "PROGRESS";
    }

    private String normalizeFileType(String fileType) {
        if (!StringUtils.hasText(fileType)) {
            return "all";
        }
        String normalized = fileType.trim().toLowerCase();
        if (!normalized.equals("all") && !normalized.equals("ppt") && !normalized.equals("pdf")) {
            return "all";
        }
        return normalized;
    }

    private void addFileToZip(
            ZipOutputStream zipOut,
            String loginId,
            String type,
            String originalPath,
            boolean include,
            Set<String> allowedExtensions
    ) throws IOException {
        if (!include || !StringUtils.hasText(originalPath)) {
            return;
        }

        File file = resolveFile(originalPath);
        if (file == null || !file.exists() || !file.isFile()) {
            return;
        }

        if (allowedExtensions != null && !allowedExtensions.isEmpty()) {
            String extension = getExtension(file.getName());
            if (!allowedExtensions.contains(extension)) {
                return;
            }
        }

        String entryName = loginId + "/" + type + "_" + file.getName();
        zipOut.putNextEntry(new ZipEntry(entryName));
        try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(file))) {
            in.transferTo(zipOut);
        }
        zipOut.closeEntry();
    }

    private File resolveFile(String path) {
        if (!StringUtils.hasText(path)) {
            return null;
        }

        Path uploadBasePath = getUploadBasePath();
        Path resolvedPath = resolveUploadPath(path, uploadBasePath);

        if (resolvedPath == null || !isAllowedUploadPath(resolvedPath, uploadBasePath)) {
            return null;
        }
        return resolvedPath.toFile();
    }

    private String getExtension(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase();
    }

    private Path getUploadBasePath() {
        Path configured = Paths.get(uploadBaseDir);
        if (!configured.isAbsolute()) {
            configured = Paths.get(System.getProperty("user.dir")).resolve(configured);
        }
        return configured.toAbsolutePath().normalize();
    }

    private Path resolveUploadPath(String rawPath, Path uploadBasePath) {
        String normalized = rawPath.replace("\\", "/").trim();
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        if (normalized.startsWith("/uploads/") || normalized.startsWith("uploads/")) {
            String relative = normalized.replaceFirst("^/?uploads/", "");
            return uploadBasePath.resolve(relative).normalize();
        }

        Path requested = Paths.get(rawPath);
        if (requested.isAbsolute()) {
            return requested.toAbsolutePath().normalize();
        }

        return uploadBasePath.resolve(requested).normalize();
    }

    private boolean isAllowedUploadPath(Path resolvedPath, Path uploadBasePath) {
        if (resolvedPath.startsWith(uploadBasePath)) {
            return true;
        }

        Path currentUploadsBase = Paths.get(System.getProperty("user.dir"), "uploads").toAbsolutePath().normalize();
        if (resolvedPath.startsWith(currentUploadsBase)) {
            return true;
        }

        Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (userDir.getParent() != null) {
            Path parentUploadsBase = userDir.getParent().resolve("uploads").toAbsolutePath().normalize();
            return resolvedPath.startsWith(parentUploadsBase);
        }

        return false;
    }

    private AdminMemberResponse toAdminMemberResponse(Member member) {
        return new AdminMemberResponse(
                member.getId(),
                member.getLoginId(),
                member.getName(),
                member.getStudentId(),
                member.getDept(),
                member.getInterests(),
                member.getDiscordTag(),
                member.getUserStatus(),
                member.getRole(),
                member.isSuspended(),
                member.getProfileImage(),
                member.getDeletedAt() == null ? null : member.getDeletedAt().toString()
        );
    }
}
