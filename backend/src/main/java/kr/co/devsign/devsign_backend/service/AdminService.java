package kr.co.devsign.devsign_backend.service;

import jakarta.annotation.PostConstruct; // ✨ 추가: 서버 켜질 때 자동 실행 도구
import jakarta.persistence.EntityManager; // ✨ 추가: DB 데이터를 직접 안전하게 수정하기 위한 도구
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
import kr.co.devsign.devsign_backend.dto.admin.NotifyMembersRequest;
import kr.co.devsign.devsign_backend.dto.admin.NotifyMembersResponse;
import kr.co.devsign.devsign_backend.dto.admin.NotifyResultItem;
import kr.co.devsign.devsign_backend.dto.admin.RestoreMemberRequest;
import kr.co.devsign.devsign_backend.dto.admin.SyncDiscordResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.TeamMember;
import kr.co.devsign.devsign_backend.repository.AccessLogRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyPeriodRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.TeamMemberRepository;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Properties; // ✨ 추가: 자바 내장 설정 파일 도구
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
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
    private final TeamMemberRepository teamMemberRepository;
    private final AccessLogService accessLogService;
    private final DiscordBotClient discordBotClient;
    private final BCryptPasswordEncoder passwordEncoder;
    
    // ✨ 추가: Repository가 없는 엔티티(Post, Comment)를 직접 조작하기 위해 EntityManager 주입
    private final EntityManager entityManager; 
    
    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    private static final Map<String, String> heroSettings = new ConcurrentHashMap<>();

    static {
        heroSettings.put("recruitmentText", "2026 recruitment open");
        heroSettings.put("applyLink", "https://open.kakao.com/o/example");
    }

    // ✨ 핵심 3: 서버가 켜질 때마다 안전한 uploads 폴더에서 설정 파일을 읽어옵니다.
    @PostConstruct
    public void initSettings() {
        try {
            File uploadDir = getUploadBasePath().toFile();
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            File file = getUploadBasePath().resolve("hero_settings.properties").toFile();
            if (file.exists()) {
                Properties props = new Properties();
                try (FileInputStream in = new FileInputStream(file)) {
                    props.load(in);
                    if (props.containsKey("recruitmentText")) {
                        heroSettings.put("recruitmentText", props.getProperty("recruitmentText"));
                    }
                    if (props.containsKey("applyLink")) {
                        heroSettings.put("applyLink", props.getProperty("applyLink"));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to load hero settings: " + e.getMessage());
        }
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
        
        // ✨ 핵심 4: 메모리가 아닌 도커 볼륨(uploads 폴더)의 실제 파일에 영구 저장합니다.
        try {
            File uploadDir = getUploadBasePath().toFile();
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            File file = getUploadBasePath().resolve("hero_settings.properties").toFile();
            Properties props = new Properties();
            props.putAll(heroSettings);
            try (FileOutputStream out = new FileOutputStream(file)) {
                props.store(out, "DEVSIGN Hero Settings");
            }
        } catch (Exception e) {
            System.err.println("Failed to save hero settings: " + e.getMessage());
            return StatusResponse.fail("save error: " + e.getMessage());
        }
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

                    // ✨ [신규] 같은 팀(ACCEPTED)에 속해 있으면 팀 정보를 함께 내려줘서
                    // 관리자 화면에서 "같은 팀=같은 파일" 임을 구분해서 보여줄 수 있게 한다.
                    Optional<TeamMember> membership = findAcceptedTeamMembership(report.getLoginId(), report.getYear(), report.getSemester());
                    Long teamId = membership.map(m -> m.getTeam().getId()).orElse(null);
                    String teamName = membership.map(m -> m.getTeam().getTeamName()).orElse(null);

                    return new AdminPeriodSubmissionResponse(
                            report.getLoginId(),
                            name,
                            studentId,
                            report.getDate(),
                            report.getPresentationPath(),
                            report.getPdfPath(),
                            report.getOtherPath(),
                            report.getMemo(),
                            teamId,
                            teamName
                    );
                })
                .toList();
    }

    // ✨ [신규] loginId가 해당 연도/학기에 속한 ACCEPTED 팀 멤버십을 찾는다 (팀 없으면 empty)
    private Optional<TeamMember> findAcceptedTeamMembership(String loginId, int year, int semester) {
        return teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(loginId, year, semester).stream()
                .filter(m -> "ACCEPTED".equals(m.getStatus()))
                .findFirst();
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

            boolean includePresentation = "all".equals(fileType) || "ppt".equals(fileType);
            boolean includePdf = "all".equals(fileType) || "pdf".equals(fileType);
            boolean includeOther = "all".equals(fileType);

            // ✨ [신규] 팀 동기화로 인해 여러 팀원의 제출 기록이 같은 물리 파일을 가리키는 경우,
            // 팀 단위로 묶어서 파일을 딱 한 번만 zip에 담는다 (중복 다운로드 방지).
            Map<Long, List<AssemblyReport>> teamGroups = new LinkedHashMap<>();
            List<AssemblyReport> soloReports = new ArrayList<>();

            for (AssemblyReport report : reports) {
                Optional<TeamMember> membership = findAcceptedTeamMembership(report.getLoginId(), report.getYear(), report.getSemester());
                if (membership.isPresent()) {
                    teamGroups.computeIfAbsent(membership.get().getTeam().getId(), k -> new ArrayList<>()).add(report);
                } else {
                    soloReports.add(report);
                }
            }

            for (AssemblyReport report : soloReports) {
                String folderName = buildMemberFolderName(report.getLoginId());
                addFileToZip(zipOut, folderName, report.getPresentationPath(), includePresentation, Set.of("ppt", "pptx"));
                addFileToZip(zipOut, folderName, report.getPdfPath(), includePdf, Set.of("pdf"));
                addFileToZip(zipOut, folderName, report.getOtherPath(), includeOther, Collections.emptySet());
            }

            for (Map.Entry<Long, List<AssemblyReport>> entry : teamGroups.entrySet()) {
                List<AssemblyReport> teamReports = entry.getValue();
                // ✨ 팀 동기화 구조상 팀원들의 파일 경로는 모두 동일하므로, 대표로 1건만 사용한다.
                AssemblyReport representative = teamReports.get(0);

                String teamName = teamMemberRepository.findByTeam_Id(entry.getKey()).stream()
                        .findFirst()
                        .map(m -> m.getTeam().getTeamName())
                        .filter(StringUtils::hasText)
                        .orElse("팀 프로젝트");
                String memberNames = teamReports.stream()
                        .map(r -> buildMemberFolderName(r.getLoginId()))
                        .distinct()
                        .collect(Collectors.joining(", "));
                String folderName = teamName + " (공동제출 - " + memberNames + ")";

                addFileToZip(zipOut, folderName, representative.getPresentationPath(), includePresentation, Set.of("ppt", "pptx"));
                addFileToZip(zipOut, folderName, representative.getPdfPath(), includePdf, Set.of("pdf"));
                addFileToZip(zipOut, folderName, representative.getOtherPath(), includeOther, Collections.emptySet());
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

    // ✨ [신규] 선택한 회원들에게 디스코드 DM으로 동일한 안내 메시지를 일괄 발송 (예: 총회자료 제출 리마인드)
    @SuppressWarnings("unchecked")
    public NotifyMembersResponse notifyMembers(NotifyMembersRequest request) {
        if (request == null || request.loginIds() == null || request.loginIds().isEmpty()) {
            throw new IllegalArgumentException("보낼 대상을 선택해주세요.");
        }
        if (!StringUtils.hasText(request.message())) {
            throw new IllegalArgumentException("보낼 메시지를 입력해주세요.");
        }

        List<NotifyResultItem> results = new ArrayList<>();
        List<String> discordTags = new ArrayList<>();
        Map<String, Member> tagToMember = new HashMap<>();

        for (String loginId : request.loginIds()) {
            Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
            if (memberOpt.isEmpty()) {
                results.add(new NotifyResultItem(loginId, loginId, "error", "존재하지 않는 회원입니다."));
                continue;
            }
            Member member = memberOpt.get();
            if (!StringUtils.hasText(member.getDiscordTag())) {
                results.add(new NotifyResultItem(loginId, member.getName(), "no_discord", "디스코드 연동 정보가 없습니다."));
                continue;
            }
            discordTags.add(member.getDiscordTag());
            tagToMember.put(member.getDiscordTag(), member);
        }

        if (!discordTags.isEmpty()) {
            try {
                Map<String, Object> botResponse = discordBotClient.sendBulkMessage(discordTags, request.message());
                List<Map<String, Object>> botResults = botResponse != null
                        ? (List<Map<String, Object>>) botResponse.getOrDefault("results", List.of())
                        : List.of();

                for (Map<String, Object> item : botResults) {
                    String tag = String.valueOf(item.get("discordTag"));
                    String status = String.valueOf(item.get("status"));
                    Member member = tagToMember.get(tag);
                    String loginId = member != null ? member.getLoginId() : tag;
                    String name = member != null ? member.getName() : tag;
                    String message = item.get("message") != null ? String.valueOf(item.get("message")) : null;
                    results.add(new NotifyResultItem(loginId, name, status, message));
                }
            } catch (Exception e) {
                for (Member member : tagToMember.values()) {
                    results.add(new NotifyResultItem(member.getLoginId(), member.getName(), "error", "봇 서버 통신 오류: " + e.getMessage()));
                }
            }
        }

        int successCount = (int) results.stream().filter(r -> "success".equals(r.status())).count();
        int failCount = results.size() - successCount;

        return new NotifyMembersResponse(successCount, failCount, results);
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

    // ✨ 핵심 변경 사항: 영구 삭제 시 관련 데이터를 먼저 '탈퇴한 사용자'로 덮어쓰도록 트랜잭션 추가
    @Transactional
    public StatusResponse deleteMember(Long id, boolean hard, String ip) {
        try {
            return memberRepository.findById(id)
                    .map(m -> {
                        accessLogService.logByMember(
                                m,
                                hard ? "ACCOUNT_PERMANENT_DELETE" : "ACCOUNT_DELETE",
                                ip
                        );

                        if (hard) {
                            String loginId = m.getLoginId();
                            
                            // ✨ [핵심 해결] 0. 6명의 범인! 삭제를 가로막는 좋아요/조회수 찌꺼기 기록 일괄 삭제 (직접 SQL 쿼리 실행)
                            entityManager.createNativeQuery("DELETE FROM comment_likes WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();
                            entityManager.createNativeQuery("DELETE FROM event_like WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();
                            entityManager.createNativeQuery("DELETE FROM event_view WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();
                            entityManager.createNativeQuery("DELETE FROM notice_view WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();
                            entityManager.createNativeQuery("DELETE FROM post_likes WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();
                            entityManager.createNativeQuery("DELETE FROM post_views WHERE member_id = :memberId")
                                    .setParameter("memberId", id)
                                    .executeUpdate();

                            // 1. 작성한 게시글을 '탈퇴한 사용자'로 익명화
                            entityManager.createQuery("UPDATE Post p SET p.author = '탈퇴한 사용자', p.loginId = 'deleted_user', p.studentId = '', p.profileImage = null WHERE p.loginId = :loginId")
                                    .setParameter("loginId", loginId)
                                    .executeUpdate();

                            // 2. 작성한 댓글을 '탈퇴한 사용자'로 익명화
                            entityManager.createQuery("UPDATE Comment c SET c.author = '탈퇴한 사용자', c.loginId = 'deleted_user', c.studentId = '', c.profileImage = null WHERE c.loginId = :loginId")
                                    .setParameter("loginId", loginId)
                                    .executeUpdate();

                            // 3. 흔적 정리가 모두 끝났으므로 안심하고 회원을 삭제합니다.
                            memberRepository.deleteById(id);
                        } else {
                            m.setDeleted(true);
                            m.setDeletedAt(LocalDateTime.now());
                            memberRepository.save(m);
                        }
                        return StatusResponse.success();
                    })
                    .orElseGet(() -> StatusResponse.fail("member not found"));
        } catch (Exception e) {
            // 에러가 나더라도 어떤 에러인지 프론트엔드로 정확히 반환합니다.
            return StatusResponse.fail("delete error: " + e.getMessage());
        }
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
            String folderName, // ✨ 변경됨 (기존 loginId, type 제거)
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

        // ✨ 핵심: ZIP 안에서의 파일 경로를 "22 김형민/원래파일명.확장자" 형태로 지정!
        String entryName = folderName + "/" + file.getName();
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

    // ✨ 학번을 2자리(예: 22)로 포맷팅하는 유틸리티 메서드 추가
    private String formatStudentId(String studentId) {
        if (studentId == null || studentId.trim().isEmpty()) return "??";
        String id = studentId.trim();
        
        // 이미 '학번'이라는 글자가 있다면 숫자만 추출
        if (id.contains("학번")) {
            id = id.replaceAll("[^0-9]", "");
        }
        
        // 8자리 학번인 경우 (예: 20221234 -> 22)
        if (id.length() == 8) {
            return id.substring(2, 4);
        }
        
        return id;
    }

    // ✨ [신규] "22 김형민" 형태의 zip 폴더명 생성 (중복 제거 로직에서 공용으로 사용)
    private String buildMemberFolderName(String loginId) {
        Member member = memberRepository.findByLoginId(loginId).orElse(null);
        if (member != null) {
            return formatStudentId(member.getStudentId()) + " " + member.getName();
        }
        return loginId;
    }
}