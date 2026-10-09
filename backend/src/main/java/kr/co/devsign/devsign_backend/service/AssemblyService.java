package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import kr.co.devsign.devsign_backend.entity.AssemblyProject;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.entity.PlanLink;
import kr.co.devsign.devsign_backend.entity.PlanRoadmapItem;
import kr.co.devsign.devsign_backend.entity.PlanRole;
import kr.co.devsign.devsign_backend.repository.AssemblyPeriodRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyProjectRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.repository.TeamMemberRepository;
import kr.co.devsign.devsign_backend.entity.TeamMember;
import kr.co.devsign.devsign_backend.dto.assembly.MyProjectItem;
import kr.co.devsign.devsign_backend.dto.assembly.MyProjectsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.RepresentativeProject;
import kr.co.devsign.devsign_backend.dto.assembly.SaveRepresentativeRequest;
import kr.co.devsign.devsign_backend.dto.assembly.AssemblyReportResponse;
import kr.co.devsign.devsign_backend.dto.assembly.MySubmissionsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectLinksRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SavePlanRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesCommand;
import kr.co.devsign.devsign_backend.dto.assembly.PlanFileUploadResponse;
import kr.co.devsign.devsign_backend.util.PlanFileExtractor;
import kr.co.devsign.devsign_backend.util.PlanCompleteness;
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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssemblyService {

    private static final int[] ACTIVE_MONTHS = new int[]{3, 4, 5, 6, 9, 10, 11, 12};

    private final AssemblyPeriodRepository periodRepository;
    private final AssemblyReportRepository reportRepository;
    private final AssemblyProjectRepository projectRepository;
    private final PlanFileExtractor planFileExtractor;
    private final kr.co.devsign.devsign_backend.util.PlanPdfGenerator planPdfGenerator;
    private final kr.co.devsign.devsign_backend.repository.MemberRepository memberRepository;
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

        reports.forEach(this::normalizeIncompletePlan);

        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .orElse(null);

        // ✨ [2026-09-21 수정] 예전에는 AssemblyProject.title을 썼는데, 이 값을 채우는 곳이
        // "팀 프로젝트 제목 동기화"뿐이어서 팀에 속하는 순간 개인 프로젝트가 팀 제목으로 덮이고,
        // 팀이 없으면 아예 비어 있었다(개인 프로젝트를 따로 노출할 방법이 없었음).
        // 마이페이지가 이미 쓰고 있는 것과 같은 출처 — 본인 계획서(3월/9월)의 "프로젝트 명"(memo) —
        // 를 그대로 쓰도록 바꿔서, 커뮤니티/마이페이지가 같은 값을 보고 팀과도 독립되게 한다.
        // ✨ [2026-09-30] 단, 웹 계획서가 도입되기 전 학기(예: 2026년 1학기)는 계획서를 파일로 냈고 그때 memo에는
        // "활동 요약"이 들어 있었다 — 그런 학기는 마이페이지에서 따로 저장했던 AssemblyProject.title을 쓴다.
        String projectTitle = resolvePersonalTitle(reports, project, semester);
        List<kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto> projectLinks = project == null
                ? List.of()
                : project.getLinks().stream()
                        .map(l -> new kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto(l.getLabel(), l.getUrl()))
                        .toList();

        List<AssemblyReportResponse> reportResponses = reports.stream()
                .map(this::toReportResponse)
                .toList();

        RepresentativeProject representative = resolveRepresentative(
                buildProjectItems(loginId, year, semester, reports, projectTitle), project);

        return new MySubmissionsResponse(reportResponses, projectTitle, projectLinks, representative);
    }

    // 개인 프로젝트 명 — 계획서의 "프로젝트 명"(memo). 계획서를 파일(발표자료/PDF/기타)로 냈던 예전 학기(예: 2026년 1학기)만
    // 그때 memo에 "활동 요약"이 들어 있어서, 마이페이지에서 따로 저장했던 제목(AssemblyProject.title)을 쓴다.
    // ✨ [2026-09-30] 예전에는 웹 계획서 항목이 비면 무조건 따로 저장된 옛 제목으로 넘어가서, 계획서를 지우거나 초기화해도
    // 프로젝트 명이 그대로 남아 보였다 — 이제 웹 계획서 학기는 계획서의 프로젝트 명만 보고, 지우면 같이 비워진다.
    private String resolvePersonalTitle(List<AssemblyReport> reports, AssemblyProject project, int semester) {
        int planMonth = (semester == 1) ? 3 : 9;
        AssemblyReport planReport = reports.stream().filter(r -> r.getMonth() == planMonth).findFirst().orElse(null);
        boolean legacyFilePlan = planReport != null && hasAnyExistingFile(planReport) && !isWebAuthoredPlan(planReport);
        if (legacyFilePlan) {
            return project != null && StringUtils.hasText(project.getTitle()) ? project.getTitle() : "";
        }
        return planReport != null && StringUtils.hasText(planReport.getMemo()) ? planReport.getMemo().trim() : "";
    }

    // ✨ [2026-09-30] 이번 학기 내 프로젝트 목록 — 개인 프로젝트(제목이나 제출 자료가 있을 때) + 수락한 팀 프로젝트들
    private List<MyProjectItem> buildProjectItems(String loginId, int year, int semester,
                                                  List<AssemblyReport> reports, String personalTitle) {
        List<MyProjectItem> items = new ArrayList<>();
        boolean hasMaterials = reports.stream().anyMatch(r -> "SUBMITTED".equals(r.getStatus()));
        // ✨ [2026-10-09] 제출 완료가 아니어도(계획서를 쓰다 말았거나 활동 요약만 적은 경우) 작성한 게 있으면 대표로 고를 수 있게
        boolean hasWritten = reports.stream().anyMatch(this::hasPersonalContent);
        if (StringUtils.hasText(personalTitle) || hasMaterials || hasWritten) {
            items.add(new MyProjectItem("PERSONAL", "PERSONAL", personalTitle, null, 1, hasMaterials));
        }
        teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(loginId, year, semester).stream()
                .filter(tm -> "ACCEPTED".equals(tm.getStatus()))
                .map(TeamMember::getTeam)
                .sorted(java.util.Comparator.comparing(t -> t.getId()))
                .forEach(team -> {
                    int count = teamMemberRepository.findByTeam_IdAndStatus(team.getId(), "ACCEPTED").size();
                    String title = StringUtils.hasText(team.getProjectTitle()) ? team.getProjectTitle() : team.getTeamName();
                    items.add(new MyProjectItem("TEAM:" + team.getId(), "TEAM", title == null ? "" : title,
                            team.getTeamName(), count, false));
                });
        return items;
    }

    private boolean hasPersonalContent(AssemblyReport r) {
        return StringUtils.hasText(r.getMemo())
                || StringUtils.hasText(r.getPlanOverview())
                || StringUtils.hasText(r.getPlanNotes())
                || (r.getPlanGoals() != null && !r.getPlanGoals().isEmpty())
                || (r.getPlanRoadmapItems() != null && !r.getPlanRoadmapItems().isEmpty())
                || (r.getPlanRoles() != null && !r.getPlanRoles().isEmpty())
                || hasAnyExistingFile(r);
    }

    // 직접 고른 대표가 아직 유효하면 그것, 아니면 자동 — 팀 프로젝트가 있으면 첫 팀, 없으면 자료를 올린 개인 프로젝트
    private RepresentativeProject resolveRepresentative(List<MyProjectItem> items, AssemblyProject project) {
        String chosenKey = project != null ? project.getRepresentativeKey() : null;
        if (StringUtils.hasText(chosenKey)) {
            for (MyProjectItem item : items) {
                if (item.key().equals(chosenKey)) {
                    return new RepresentativeProject(item.key(), item.type(), item.title(), item.teamName(), true);
                }
            }
        }
        MyProjectItem auto = items.stream().filter(i -> "TEAM".equals(i.type())).findFirst()
                .or(() -> items.stream().filter(i -> "PERSONAL".equals(i.type()) && i.hasMaterials()).findFirst())
                .or(() -> items.stream().filter(i -> "PERSONAL".equals(i.type())).findFirst())
                .orElse(null);
        return auto == null ? null
                : new RepresentativeProject(auto.key(), auto.type(), auto.title(), auto.teamName(), false);
    }

    public MyProjectsResponse getMyProjects(String loginId, int year, int semester) {
        List<AssemblyReport> reports = reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);
        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester).orElse(null);
        List<MyProjectItem> items = buildProjectItems(loginId, year, semester, reports,
                resolvePersonalTitle(reports, project, semester));
        return new MyProjectsResponse(items, resolveRepresentative(items, project));
    }

    // ✨ [2026-09-30] 대표 프로젝트 저장 — 내 프로젝트 목록에 있는 것만 고를 수 있고, 빈 값이면 자동 선택으로 되돌린다
    @Transactional
    public MyProjectsResponse saveRepresentative(SaveRepresentativeRequest req) {
        String key = req.key() == null ? "" : req.key().trim();
        if (StringUtils.hasText(key)) {
            List<AssemblyReport> reports = reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(req.loginId(), req.year(), req.semester());
            AssemblyProject existing = projectRepository.findByLoginIdAndYearAndSemester(req.loginId(), req.year(), req.semester()).orElse(null);
            boolean valid = buildProjectItems(req.loginId(), req.year(), req.semester(), reports,
                    resolvePersonalTitle(reports, existing, req.semester())).stream().anyMatch(i -> i.key().equals(key));
            if (!valid) {
                throw new IllegalArgumentException("내 프로젝트만 대표로 정할 수 있어요.");
            }
        }
        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(req.loginId(), req.year(), req.semester())
                .orElseGet(() -> {
                    AssemblyProject p = new AssemblyProject();
                    p.setLoginId(req.loginId());
                    p.setYear(req.year());
                    p.setSemester(req.semester());
                    return p;
                });
        project.setRepresentativeKey(StringUtils.hasText(key) ? key : null);
        projectRepository.save(project);
        return getMyProjects(req.loginId(), req.year(), req.semester());
    }

    // ✨ [2026-09-30] 마이페이지에서 내가 올린 달 자료 삭제 — 본인 것만, 그 달 제출 기간 안에서만.
    // 올린 파일을 지우고 내용(메모·계획서 항목)을 비워 "미제출"로 되돌린다.
    @Transactional
    public void deleteMyReport(String loginId, Long reportId) {
        AssemblyReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("삭제할 자료를 찾을 수 없어요."));
        if (!loginId.equals(report.getLoginId())) {
            throw new IllegalStateException("본인 자료만 삭제할 수 있습니다.");
        }
        if (!isWithinSubmissionPeriod(report.getYear(), report.getMonth())) {
            throw new IllegalArgumentException("제출 기간에만 삭제할 수 있어요.");
        }
        deleteStoredFileQuietly(report.getPresentationPath());
        deleteStoredFileQuietly(report.getPdfPath());
        deleteStoredFileQuietly(report.getOtherPath());
        deleteStoredFileQuietly(report.getPlanFilePath());
        report.setPresentationPath(null);
        report.setPdfPath(null);
        report.setOtherPath(null);
        report.setPlanFilePath(null);
        report.setMemo(null);
        report.setTitle(null);
        report.setDate(null);
        report.setPlanOverview(null);
        report.getPlanGoals().clear();
        report.getPlanRoadmapItems().clear();
        report.getPlanRoles().clear();
        report.getPlanLinks().clear();
        report.setPlanNotes(null);
        report.setStatus("NOT_SUBMITTED");
        reportRepository.save(report);
    }

    // 마이페이지와 같은 기준 — 관리자가 정한 제출 기간(없으면 그 달 1일~28일) 안인지, 한국 날짜로 비교 (팀 자료 삭제도 같이 씀)
    public boolean isWithinSubmissionPeriod(int year, int month) {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        return getSubmissionPeriods(year).stream()
                .filter(p -> p.month() == month)
                .findFirst()
                .map(p -> !today.isBefore(LocalDate.parse(p.startDate())) && !today.isAfter(LocalDate.parse(p.endDate())))
                .orElse(false);
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

    // ✨ [2026-09-07 추가] 마이페이지 학기별 깃/노션 등 관련 링크 저장 — 프로젝트 명(title)은
    // 건드리지 않고 links만 독립적으로 갱신한다(계획서에서 관리하는 프로젝트 명과 저장 경로가
    // 섞이지 않도록 완전히 분리된 메서드/엔드포인트로 둠)
    public void saveProjectLinks(SaveProjectLinksRequest params) {
        String loginId = params.loginId();
        int year = params.year();
        int semester = params.semester();

        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .orElse(new AssemblyProject());

        project.setLoginId(loginId);
        project.setYear(year);
        project.setSemester(semester);
        project.setLinks(params.links() == null
                ? new ArrayList<>()
                : params.links().stream()
                        .filter(l -> l != null && StringUtils.hasText(l.label()) && StringUtils.hasText(l.url()))
                        .map(l -> new PlanLink(l.label(), l.url()))
                        .collect(java.util.stream.Collectors.toCollection(ArrayList::new)));

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

        return "submitted";
    }

    // ✨ [2026-09-02 추가] loginId/reportId로 기존 리포트를 찾거나, 없으면 새로 만든다.
    // submitFiles/savePlanDraft/submitPlan이 공통으로 쓰던 조회 로직을 하나로 합침.
    private AssemblyReport findOrCreateReport(String loginId, String reportId, int year, int semester, int month) {
        AssemblyReport report = null;

        if (reportId != null && !reportId.equals("0") && !reportId.startsWith("temp")) {
            report = reportRepository.findById(Long.parseLong(reportId)).orElse(null);
            // ✨ [2026-09-29] 다른 부원의 리포트 id로는 절대 수정하지 못하게 막고,
            // 본인 것이라도 다른 학기/달의 id가 섞여 오면 무시하고 아래에서 다시 찾는다
            if (report != null && !loginId.equals(report.getLoginId())) {
                throw new IllegalStateException("본인 자료만 수정할 수 있습니다.");
            }
            if (report != null && (report.getYear() != year || report.getSemester() != semester || report.getMonth() != month)) {
                report = null;
            }
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
    @Transactional
    public AssemblyReportResponse savePlanDraft(SavePlanRequest req) {
        AssemblyReport report = findOrCreateReport(req.loginId(), req.reportId(), req.year(), req.semester(), req.month());
        applyPlanFields(report, req);
        // ✨ [2026-09-30] 제출한 뒤 필수 항목을 지우면 "제출됨"으로 남지 않고 작성 중(미제출)으로 되돌린다
        if (!"SUBMITTED".equals(report.getStatus()) || !isPersonalPlanComplete(report)) {
            if ("SUBMITTED".equals(report.getStatus())) report.setDate(null);
            report.setStatus("DRAFT");
        }
        return toReportResponse(reportRepository.save(report));
    }

    // ✨ [2026-09-02 추가] 계획서 제출 확정 — 상태를 SUBMITTED로 바꿈.
    // ✨ [2026-09-04] 팀원 간 자동 동기화(syncToTeammates)는 제거함 — 개인 제출은 팀 소속 여부와
    // 무관하게 항상 독립적으로 유지된다. 팀 단위 공유 자료는 TeamSubmissionService가 별도로 담당.
    @Transactional
    public AssemblyReportResponse submitPlan(SavePlanRequest req) {
        AssemblyReport report = findOrCreateReport(req.loginId(), req.reportId(), req.year(), req.semester(), req.month());
        applyPlanFields(report, req);
        if (!isPersonalPlanComplete(report)) {
            throw new IllegalArgumentException(PlanCompleteness.MISSING_MESSAGE);
        }
        report.setStatus("SUBMITTED");
        report.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));

        AssemblyReport saved = reportRepository.save(report);
        return toReportResponse(saved);
    }

    private void applyPlanFields(AssemblyReport report, SavePlanRequest req) {
        report.setMemo(req.memo());
        report.setPlanOverview(req.planOverview());
        report.setPlanGoals(req.planGoals() != null ? new ArrayList<>(req.planGoals()) : new ArrayList<>());
        report.setPlanRoadmapItems(req.planRoadmapItems() != null
                ? req.planRoadmapItems().stream().map(t -> new PlanRoadmapItem(t.title(), t.startDate(), t.endDate(), t.detail())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        report.setPlanRoles(req.planRoles() != null
                ? req.planRoles().stream().map(r -> new PlanRole(r.loginId(), r.name(), r.role(), r.duties())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        report.setPlanLinks(req.planLinks() != null
                ? req.planLinks().stream().map(l -> new PlanLink(l.label(), l.url())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        report.setPlanNotes(req.planNotes());
    }

    // ✨ [2026-09-29 추가] 계획서를 파일(PDF/DOCX/HWP/HWPX/PPTX)로 올리기 — 원본은 첨부로 보관하고,
    // 양식 기준으로 추출한 내용은 저장하지 않은 채 돌려준다(프론트 폼에 채운 뒤 확인·자동저장·제출 흐름 그대로).
    @Transactional
    public PlanFileUploadResponse<AssemblyReportResponse> uploadPlanFile(
            String loginId, String reportId, int year, int semester, int month, MultipartFile file
    ) throws IOException {
        String extension = requirePlanFileExtension(file);
        AssemblyReport report = findOrCreateReport(loginId, reportId, year, semester, month);
        if (report.getId() != null && !loginId.equals(report.getLoginId())) {
            throw new IllegalArgumentException("본인 계획서에만 파일을 올릴 수 있습니다.");
        }
        if (!"PLAN".equals(report.getType())) {
            throw new IllegalArgumentException("계획서 제출 달에만 계획서 파일을 올릴 수 있습니다.");
        }

        Path uploadBasePath = getUploadBasePath();
        Path userPath = uploadBasePath.resolve(loginId).resolve(String.valueOf(month)).normalize();
        validateWithinBase(userPath, uploadBasePath);
        Files.createDirectories(userPath);

        Path targetPath = userPath.resolve(buildPlanFileName(file)).normalize();
        validateWithinBase(targetPath, uploadBasePath);
        file.transferTo(targetPath.toFile());

        String previousPath = report.getPlanFilePath();
        report.setPlanFilePath(toStoredPath(uploadBasePath, targetPath));
        if (!"SUBMITTED".equals(report.getStatus())) {
            report.setStatus("DRAFT");
        }
        AssemblyReport saved = reportRepository.save(report);
        deleteStoredFileQuietly(previousPath);

        PlanFileExtractor.Result result = planFileExtractor.extract(targetPath, extension, year);
        return new PlanFileUploadResponse<>(toReportResponse(saved), result.plan(), result.templateRecognized(), result.warnings());
    }

    @Transactional
    public AssemblyReportResponse removePlanFile(String loginId, String reportId, int year, int semester, int month) {
        AssemblyReport report = findOrCreateReport(loginId, reportId, year, semester, month);
        if (report.getId() == null || !loginId.equals(report.getLoginId())) {
            throw new IllegalArgumentException("계획서를 찾을 수 없습니다.");
        }
        String previousPath = report.getPlanFilePath();
        report.setPlanFilePath(null);
        AssemblyReport saved = reportRepository.save(report);
        deleteStoredFileQuietly(previousPath);
        return toReportResponse(saved);
    }

    static String requirePlanFileExtension(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드할 계획서 파일을 선택해주세요.");
        }
        String extension = PlanFileExtractor.extensionOf(file.getOriginalFilename());
        if (!PlanFileExtractor.ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("계획서 파일은 PDF, Word(.docx), 한글(.hwp/.hwpx), PowerPoint(.pptx)만 올릴 수 있습니다.");
        }
        if (file.getSize() > 50L * 1024 * 1024) {
            throw new IllegalArgumentException("계획서 파일은 50MB 이하만 올릴 수 있습니다.");
        }
        return extension;
    }

    // 저장 파일명: plan_<32자리 uuid>_<원본 파일명> — 다운로드 시 접두어는 떼고 원본 이름으로 내려준다
    static String buildPlanFileName(MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String fileName = Paths.get(original).getFileName().toString().replaceAll("[\\\\/:*?\"<>|]", "_");
        if (!StringUtils.hasText(fileName)) {
            fileName = "plan";
        }
        if (fileName.length() > 150) {
            fileName = fileName.substring(fileName.length() - 150);
        }
        return "plan_" + UUID.randomUUID().toString().replace("-", "") + "_" + fileName;
    }

    private void deleteStoredFileQuietly(String storedPath) {
        if (!StringUtils.hasText(storedPath)) return;
        try {
            Path uploadBasePath = getUploadBasePath();
            Path resolved = resolveUploadPath(storedPath, uploadBasePath);
            if (resolved != null && resolved.startsWith(uploadBasePath)) {
                Files.deleteIfExists(resolved);
            }
        } catch (IOException | RuntimeException ignored) {
            // 이전 첨부 파일 정리 실패는 업로드 자체를 막지 않는다
        }
    }

    private static boolean isPersonalPlanComplete(AssemblyReport report) {
        return StringUtils.hasText(report.getMemo())
                && PlanCompleteness.isComplete(report.getPlanOverview(), report.getPlanGoals(), report.getPlanRoadmapItems());
    }

    // 웹 계획서 달(3·9월)인데 "제출됨"이면서 필수 항목이 빠진 것 → 미제출(작성 중)로 바로잡는다.
    // 예전 학기처럼 계획서를 파일(발표자료/PDF/기타)로 낸 경우는 웹 항목이 원래 비어 있으므로 건드리지 않는다.
    private boolean normalizeIncompletePlan(AssemblyReport report) {
        boolean planMonth = report.getMonth() == 3 || report.getMonth() == 9;
        if (planMonth && "SUBMITTED".equals(report.getStatus()) && !hasAnyExistingFile(report)
                && !isPersonalPlanComplete(report)) {
            report.setStatus("DRAFT");
            report.setDate(null);
            reportRepository.save(report);
            return true;
        }
        return false;
    }

    static boolean isWebAuthoredPlan(AssemblyReport report) {
        return StringUtils.hasText(report.getPlanOverview())
                || !report.getPlanGoals().isEmpty()
                || !report.getPlanRoadmapItems().isEmpty();
    }

    // ✨ [2026-09-30] 웹으로 작성한 계획서를 PDF로 — 커뮤니티에서 부원 계획서를 내려받을 때 사용 (로그인한 부원 누구나)
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> planPdf(Long reportId) {
        AssemblyReport report = reportRepository.findById(reportId).orElse(null);
        if (report == null || !"PLAN".equals(report.getType()) || !isWebAuthoredPlan(report)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new byte[0]);
        }
        String author = memberRepository.findByLoginId(report.getLoginId()).map(m -> m.getName()).orElse(report.getLoginId());
        String title = StringUtils.hasText(report.getMemo()) ? report.getMemo() : report.getMonth() + "월 계획서";
        byte[] pdf = planPdfGenerator.generate(
                title, author, report.getDate(), report.getPlanOverview(), report.getPlanGoals(),
                report.getPlanRoadmapItems().stream()
                        .map(t -> new kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto(t.getTitle(), t.getStartDate(), t.getEndDate(), t.getDetail()))
                        .toList(),
                report.getPlanRoles().stream()
                        .map(r -> new kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto(r.getLoginId(), r.getName(), r.getRole(), r.getDuties()))
                        .toList(),
                report.getPlanLinks().stream()
                        .map(l -> new kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto(l.getLabel(), l.getUrl()))
                        .toList(),
                report.getPlanNotes());
        return pdfResponse(pdf, author + "_" + title + ".pdf");
    }

    static ResponseEntity<byte[]> pdfResponse(byte[] pdf, String fileName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(fileName.replaceAll("[\\\\/:*?\"<>|]", "_"), StandardCharsets.UTF_8)
                .build());
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
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
            String fileName = resolvedPath.getFileName().toString().replaceFirst("^plan_[0-9a-f]{32}_", "");

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
                report.getPlanOverview(),
                new ArrayList<>(report.getPlanGoals()),
                report.getPlanRoadmapItems().stream()
                        .map(t -> new kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto(t.getTitle(), t.getStartDate(), t.getEndDate(), t.getDetail()))
                        .toList(),
                report.getPlanRoles().stream()
                        .map(r -> new kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto(r.getLoginId(), r.getName(), r.getRole(), r.getDuties()))
                        .toList(),
                report.getPlanLinks().stream()
                        .map(l -> new kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto(l.getLabel(), l.getUrl()))
                        .toList(),
                report.getPlanNotes(),
                report.getPlanFilePath()
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
