package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import kr.co.devsign.devsign_backend.entity.AssemblyProject;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.entity.TeamMember;
import kr.co.devsign.devsign_backend.repository.AssemblyPeriodRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyProjectRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.repository.TeamMemberRepository;
import kr.co.devsign.devsign_backend.dto.assembly.AssemblyReportResponse;
import kr.co.devsign.devsign_backend.dto.assembly.MySubmissionsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SavePlanRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssemblyService {

    private static final int[] ACTIVE_MONTHS = new int[]{3, 4, 5, 6, 9, 10, 11, 12};
    private static final String TEAM_STATUS_ACCEPTED = "ACCEPTED";

    private final AssemblyPeriodRepository periodRepository;
    private final AssemblyReportRepository reportRepository;
    private final AssemblyProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    public List<SubmissionPeriodResponse> getSubmissionPeriods(int year) {
        List<AssemblyPeriod> savedPeriods = periodRepository.findByYearOrderByMonthAsc(year);
        Map<Integer, AssemblyPeriod> periodByMonth = savedPeriods.stream()
                .collect(java.util.stream.Collectors.toMap(AssemblyPeriod::getMonth, p -> p, (a, b) -> a));

        return Arrays.stream(ACTIVE_MONTHS)
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

                    return new SubmissionPeriodResponse(
                            period != null ? period.getId() : null,
                            month,
                            year,
                            semester,
                            type,
                            startDate.toString(),
                            endDate.toString()
                    );
                })
                .toList();
    }

    public MySubmissionsResponse getMySubmissions(String loginId, int year, int semester) {
        List<AssemblyReport> reports =
                reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);

        if (reports.isEmpty()) {
            int[] months = (semester == 1) ? new int[]{3, 4, 5, 6} : new int[]{9, 10, 11, 12};
            for (int month : months) {
                AssemblyReport r = new AssemblyReport();
                r.setLoginId(loginId);
                r.setYear(year);
                r.setSemester(semester);
                r.setMonth(month);
                r.setStatus("NOT_SUBMITTED");
                r.setType(resolveType(month));
                reportRepository.save(r);
            }
            reports = reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);
        }

        String projectTitle = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .map(AssemblyProject::getTitle)
                .orElse("");

        List<AssemblyReportResponse> reportResponses = reports.stream()
                .map(this::toReportResponse)
                .toList();

        return new MySubmissionsResponse(reportResponses, projectTitle);
    }

    public void saveProjectTitle(SaveProjectTitleRequest params) {
        String loginId = params.loginId();
        int year = params.year();
        int semester = params.semester();
        String title = params.title();

        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .orElse(new AssemblyProject());

        project.setLoginId(loginId);
        project.setYear(year);
        project.setSemester(semester);
        project.setTitle(title);

        projectRepository.save(project);
    }

    public String submitFiles(SubmitFilesCommand command) throws Exception {
        String loginId = command.loginId();
        String reportId = command.reportId();
        int year = command.year();
        int semester = command.semester();
        int month = command.month();
        String memo = command.memo();
        MultipartFile presentation = command.presentation();
        MultipartFile pdf = command.pdf();
        MultipartFile other = command.other();

        AssemblyReport report = findOrCreateReport(loginId, reportId, year, semester, month);

        validateUploadFiles(presentation, pdf, other, report);

        Path uploadBasePath = getUploadBasePath();
        Path userPath = uploadBasePath.resolve(loginId).resolve(String.valueOf(month)).normalize();
        validateWithinBase(userPath, uploadBasePath);
        Files.createDirectories(userPath);

        if (presentation != null && !presentation.isEmpty()) {
            String fileName = buildStorageFileName("pres_", presentation);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            presentation.transferTo(targetPath.toFile());
            report.setPresentationPath(toStoredPath(uploadBasePath, targetPath));
        }

        if (pdf != null && !pdf.isEmpty()) {
            String fileName = buildStorageFileName("pdf_", pdf);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            pdf.transferTo(targetPath.toFile());
            report.setPdfPath(toStoredPath(uploadBasePath, targetPath));
        }

        if (other != null && !other.isEmpty()) {
            String fileName = buildStorageFileName("other_", other);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            other.transferTo(targetPath.toFile());
            report.setOtherPath(toStoredPath(uploadBasePath, targetPath));
        }

        report.setMemo(memo);
        report.setStatus("SUBMITTED");
        report.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));

        reportRepository.save(report);

        // ✨ [신규] 같은 팀(ACCEPTED) 소속이라면, 방금 제출한 내용을 팀원 전체에게 동기화한다.
        syncToTeammates(report);

        return "submitted";
    }

    // ✨ [2026-09-02 추가] loginId/reportId로 기존 리포트를 찾거나, 없으면 새로 만든다.
    // submitFiles/savePlanDraft/submitPlan이 공통으로 쓰던 조회 로직을 하나로 합침.
    private AssemblyReport findOrCreateReport(String loginId, String reportId, int year, int semester, int month) {
        AssemblyReport report = null;

        if (reportId != null && !reportId.equals("0") && !reportId.startsWith("temp")) {
            report = reportRepository.findById(Long.parseLong(reportId)).orElse(null);
        }

        if (report == null) {
            List<AssemblyReport> existing =
                    reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);

            report = existing.stream()
                    .filter(r -> r.getMonth() == month)
                    .findFirst()
                    .orElse(null);
        }

        if (report == null) {
            report = new AssemblyReport();
            report.setLoginId(loginId);
            report.setYear(year);
            report.setSemester(semester);
            report.setMonth(month);
            report.setStatus("NOT_SUBMITTED");
            report.setType(resolveType(month));
        }

        return report;
    }

    // ✨ [2026-09-02 추가] 계획서(PLAN)를 웹에서 작성 중일 때 자동/수동 임시저장.
    // 팀 동기화는 여기서 하지 않음 — 타이핑할 때마다 팀원 화면까지 계속 갱신되면 번잡하므로,
    // 동기화는 "제출 확정"(submitPlan) 시점에만 한다.
    @Transactional
    public AssemblyReportResponse savePlanDraft(SavePlanRequest req) {
        AssemblyReport report = findOrCreateReport(req.loginId(), req.reportId(), req.year(), req.semester(), req.month());
        applyPlanFields(report, req);
        if (!"SUBMITTED".equals(report.getStatus())) {
            report.setStatus("DRAFT");
        }
        return toReportResponse(reportRepository.save(report));
    }

    // ✨ [2026-09-02 추가] 계획서 제출 확정 — 상태를 SUBMITTED로 바꾸고 팀원에게 동기화.
    @Transactional
    public AssemblyReportResponse submitPlan(SavePlanRequest req) {
        AssemblyReport report = findOrCreateReport(req.loginId(), req.reportId(), req.year(), req.semester(), req.month());
        applyPlanFields(report, req);
        report.setStatus("SUBMITTED");
        report.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));

        AssemblyReport saved = reportRepository.save(report);
        syncToTeammates(saved);
        return toReportResponse(saved);
    }

    private void applyPlanFields(AssemblyReport report, SavePlanRequest req) {
        report.setMemo(req.memo());
        report.setPlanGoal(req.planGoal());
        report.setPlanSchedule(req.planSchedule());
        report.setPlanTeamRoles(req.planTeamRoles());
        report.setPlanBudget(req.planBudget());
        report.setPlanNotes(req.planNotes());
    }

    // ✨ [신규] 제출자가 속한 팀의 다른 accepted 팀원들에게 제출 내용을 그대로 복사해준다.
    // 팀이 없는 사용자는 기존과 동일하게 아무 영향이 없다.
    private void syncToTeammates(AssemblyReport report) {
        List<TeamMember> myMemberships = teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(
                report.getLoginId(), report.getYear(), report.getSemester());

        TeamMember myMembership = myMemberships.stream()
                .filter(m -> TEAM_STATUS_ACCEPTED.equals(m.getStatus()))
                .findFirst()
                .orElse(null);

        if (myMembership == null) {
            return;
        }

        Long teamId = myMembership.getTeam().getId();
        List<TeamMember> teammates = teamMemberRepository.findByTeam_IdAndStatus(teamId, TEAM_STATUS_ACCEPTED);

        for (TeamMember teammate : teammates) {
            if (teammate.getLoginId().equals(report.getLoginId())) {
                continue;
            }

            AssemblyReport teammateReport = reportRepository
                    .findByLoginIdAndYearAndSemesterOrderByMonthAsc(teammate.getLoginId(), report.getYear(), report.getSemester())
                    .stream()
                    .filter(r -> r.getMonth() == report.getMonth())
                    .findFirst()
                    .orElseGet(() -> {
                        AssemblyReport r = new AssemblyReport();
                        r.setLoginId(teammate.getLoginId());
                        r.setYear(report.getYear());
                        r.setSemester(report.getSemester());
                        r.setMonth(report.getMonth());
                        return r;
                    });

            teammateReport.setType(report.getType());
            teammateReport.setStatus(report.getStatus());
            teammateReport.setMemo(report.getMemo());
            teammateReport.setDate(report.getDate());
            teammateReport.setPresentationPath(report.getPresentationPath());
            teammateReport.setPdfPath(report.getPdfPath());
            teammateReport.setOtherPath(report.getOtherPath());
            // ✨ [2026-09-02 추가] 웹 작성 계획서도 팀원에게 그대로 동기화
            teammateReport.setPlanGoal(report.getPlanGoal());
            teammateReport.setPlanSchedule(report.getPlanSchedule());
            teammateReport.setPlanTeamRoles(report.getPlanTeamRoles());
            teammateReport.setPlanBudget(report.getPlanBudget());
            teammateReport.setPlanNotes(report.getPlanNotes());

            reportRepository.save(teammateReport);
        }
    }

    public ResponseEntity<byte[]> downloadFile(String path) {
        try {
            if (!StringUtils.hasText(path)) {
                return ResponseEntity.badRequest().body(new byte[0]);
            }

            Path uploadBasePath = getUploadBasePath();
            Path resolvedPath = resolveUploadPath(path, uploadBasePath);

            if (resolvedPath == null || !isAllowedUploadPath(resolvedPath, uploadBasePath)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new byte[0]);
            }

            if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new byte[0]);
            }

            byte[] data = Files.readAllBytes(resolvedPath);
            String fileName = resolvedPath.getFileName().toString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename(fileName, StandardCharsets.UTF_8)
                    .build());

            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new byte[0]);
        }
    }

    private void validateUploadFiles(
            MultipartFile presentation,
            MultipartFile pdf,
            MultipartFile other,
            AssemblyReport report
    ) {
        validateExtension(
                presentation,
                Set.of("ppt", "pptx"),
                "발표자료는 .ppt 또는 .pptx 파일만 업로드할 수 있습니다."
        );
        validateExtension(
                pdf,
                Set.of("pdf"),
                "PDF 항목에는 .pdf 파일만 업로드할 수 있습니다."
        );

        boolean hasNewFile = hasUpload(presentation) || hasUpload(pdf) || hasUpload(other);
        boolean hasExistingFile = hasAnyExistingFile(report);

        if (!hasNewFile && !hasExistingFile) {
            throw new IllegalArgumentException("발표자료, PDF, 기타자료 중 하나 이상 업로드해야 합니다.");
        }
    }

    private boolean hasUpload(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private boolean hasAnyExistingFile(AssemblyReport report) {
        return StringUtils.hasText(report.getPresentationPath())
                || StringUtils.hasText(report.getPdfPath())
                || StringUtils.hasText(report.getOtherPath());
    }

    private void validateExtension(MultipartFile file, Set<String> allowedExtensions, String message) {
        if (!hasUpload(file)) {
            return;
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new IllegalArgumentException(message);
        }

        int lastDot = originalFilename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == originalFilename.length() - 1) {
            throw new IllegalArgumentException(message);
        }

        String extension = originalFilename.substring(lastDot + 1).toLowerCase();
        if (!allowedExtensions.contains(extension)) {
            throw new IllegalArgumentException(message);
        }
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

    private AssemblyReportResponse toReportResponse(AssemblyReport report) {
        return new AssemblyReportResponse(
                report.getId(),
                report.getLoginId(),
                report.getYear(),
                report.getSemester(),
                report.getMonth(),
                report.getType(),
                report.getStatus(),
                report.getTitle(),
                report.getMemo(),
                report.getDate(),
                report.getDeadline(),
                report.getPresentationPath(),
                report.getPdfPath(),
                report.getOtherPath(),
                report.getPlanGoal(),
                report.getPlanSchedule(),
                report.getPlanTeamRoles(),
                report.getPlanBudget(),
                report.getPlanNotes()
        );
    }

    private Path getUploadBasePath() {
        Path configured = Paths.get(uploadBaseDir);
        if (!configured.isAbsolute()) {
            configured = Paths.get(System.getProperty("user.dir")).resolve(configured);
        }
        return configured.toAbsolutePath().normalize();
    }

    private String buildStorageFileName(String prefix, MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String fileName = Paths.get(original).getFileName().toString();
        if (!StringUtils.hasText(fileName)) {
            fileName = "file";
        }
        return prefix + fileName;
    }

    private String toStoredPath(Path uploadBasePath, Path targetPath) {
        return uploadBasePath.relativize(targetPath).toString().replace(File.separatorChar, '/');
    }

    private void validateWithinBase(Path targetPath, Path basePath) {
        if (!targetPath.startsWith(basePath)) {
            throw new IllegalArgumentException("invalid upload path");
        }
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
}
