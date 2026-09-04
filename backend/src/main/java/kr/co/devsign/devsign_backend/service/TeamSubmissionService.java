package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto;
import kr.co.devsign.devsign_backend.dto.team.SaveTeamPlanRequest;
import kr.co.devsign.devsign_backend.dto.team.SubmitTeamFilesCommand;
import kr.co.devsign.devsign_backend.dto.team.TeamSubmissionResponse;
import kr.co.devsign.devsign_backend.entity.PlanLink;
import kr.co.devsign.devsign_backend.entity.PlanRoadmapItem;
import kr.co.devsign.devsign_backend.entity.PlanRole;
import kr.co.devsign.devsign_backend.entity.Team;
import kr.co.devsign.devsign_backend.entity.TeamSubmission;
import kr.co.devsign.devsign_backend.repository.TeamMemberRepository;
import kr.co.devsign.devsign_backend.repository.TeamRepository;
import kr.co.devsign.devsign_backend.repository.TeamSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// 팀 프로젝트 탭에서 "팀 공유 자료"를 다루는 서비스. 개인 마이페이지(AssemblyService)와는
// 완전히 독립적인 트랙 — 팀에 속해도 개인 제출은 이 서비스와 무관하게 그대로 유지된다.
@Service
@RequiredArgsConstructor
public class TeamSubmissionService {

    private static final String STATUS_ACCEPTED = "ACCEPTED";
    private static final String STATUS_SUBMITTED = "SUBMITTED";

    private final TeamSubmissionRepository submissionRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    public List<TeamSubmissionResponse> getMySubmissions(Long teamId, int year, int semester) {
        List<TeamSubmission> subs = submissionRepository.findByTeam_IdAndYearAndSemesterOrderByMonthAsc(teamId, year, semester);

        if (subs.isEmpty()) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
            int[] months = semester == 1 ? new int[]{3, 4, 5, 6} : new int[]{9, 10, 11, 12};
            for (int month : months) {
                TeamSubmission s = new TeamSubmission();
                s.setTeam(team);
                s.setYear(year);
                s.setSemester(semester);
                s.setMonth(month);
                s.setStatus("NOT_SUBMITTED");
                s.setType(resolveType(month));
                submissionRepository.save(s);
            }
            subs = submissionRepository.findByTeam_IdAndYearAndSemesterOrderByMonthAsc(teamId, year, semester);
        }

        return subs.stream().map(this::toResponse).toList();
    }

    // ✨ "팀원 누구나" 업로드/수정 가능 — ACCEPTED 상태인 팀원인지만 확인
    private void requireAcceptedMember(Long teamId, String loginId) {
        boolean isMember = teamMemberRepository.findByTeam_IdAndLoginId(teamId, loginId)
                .filter(m -> STATUS_ACCEPTED.equals(m.getStatus()))
                .isPresent();
        if (!isMember) {
            throw new IllegalStateException("이 팀의 팀원만 자료를 올리거나 수정할 수 있습니다.");
        }
    }

    @Transactional
    public TeamSubmissionResponse savePlanDraft(SaveTeamPlanRequest req) {
        requireAcceptedMember(req.teamId(), req.loginId());
        TeamSubmission sub = findOrCreate(req.teamId(), req.submissionId(), req.year(), req.semester(), req.month());
        applyPlanFields(sub, req);
        sub.setUpdatedBy(req.loginId());
        if (!STATUS_SUBMITTED.equals(sub.getStatus())) {
            sub.setStatus("DRAFT");
        }
        return toResponse(submissionRepository.save(sub));
    }

    @Transactional
    public TeamSubmissionResponse submitPlan(SaveTeamPlanRequest req) {
        requireAcceptedMember(req.teamId(), req.loginId());
        TeamSubmission sub = findOrCreate(req.teamId(), req.submissionId(), req.year(), req.semester(), req.month());
        applyPlanFields(sub, req);
        sub.setUpdatedBy(req.loginId());
        sub.setStatus(STATUS_SUBMITTED);
        sub.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));
        return toResponse(submissionRepository.save(sub));
    }

    @Transactional
    public String submitFiles(SubmitTeamFilesCommand command) throws IOException {
        requireAcceptedMember(command.teamId(), command.loginId());
        TeamSubmission sub = findOrCreate(command.teamId(), command.submissionId(), command.year(), command.semester(), command.month());

        boolean hasNewFile = hasUpload(command.presentation()) || hasUpload(command.pdf()) || hasUpload(command.other());
        boolean hasExistingFile = StringUtils.hasText(sub.getPresentationPath())
                || StringUtils.hasText(sub.getPdfPath())
                || StringUtils.hasText(sub.getOtherPath());
        if (!hasNewFile && !hasExistingFile) {
            throw new IllegalArgumentException("발표자료, PDF, 기타자료 중 하나 이상 업로드해야 합니다.");
        }

        File uploadDir = new File(uploadBaseDir, "team_" + command.teamId() + "/" + command.month());
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        if (hasUpload(command.presentation())) {
            sub.setPresentationPath(saveTeamFile(uploadDir, command.teamId(), command.month(), "pres_", command.presentation()));
        }
        if (hasUpload(command.pdf())) {
            sub.setPdfPath(saveTeamFile(uploadDir, command.teamId(), command.month(), "pdf_", command.pdf()));
        }
        if (hasUpload(command.other())) {
            sub.setOtherPath(saveTeamFile(uploadDir, command.teamId(), command.month(), "other_", command.other()));
        }

        sub.setMemo(command.memo());
        sub.setUpdatedBy(command.loginId());
        sub.setStatus(STATUS_SUBMITTED);
        sub.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));
        submissionRepository.save(sub);

        return "submitted";
    }

    private boolean hasUpload(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private String saveTeamFile(File uploadDir, Long teamId, int month, String prefix, MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String fileName = prefix + UUID.randomUUID() + "_" + original;
        File dest = new File(uploadDir, fileName);
        file.transferTo(dest);
        return "team_" + teamId + "/" + month + "/" + fileName;
    }

    private TeamSubmission findOrCreate(Long teamId, String submissionId, int year, int semester, int month) {
        TeamSubmission sub = null;
        if (submissionId != null && !submissionId.equals("0") && !submissionId.startsWith("temp")) {
            sub = submissionRepository.findById(Long.parseLong(submissionId)).orElse(null);
        }
        if (sub == null) {
            sub = submissionRepository.findByTeam_IdAndYearAndSemesterOrderByMonthAsc(teamId, year, semester).stream()
                    .filter(s -> s.getMonth() == month)
                    .findFirst()
                    .orElse(null);
        }
        if (sub == null) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
            sub = new TeamSubmission();
            sub.setTeam(team);
            sub.setYear(year);
            sub.setSemester(semester);
            sub.setMonth(month);
            sub.setStatus("NOT_SUBMITTED");
            sub.setType(resolveType(month));
        }
        return sub;
    }

    private void applyPlanFields(TeamSubmission sub, SaveTeamPlanRequest req) {
        sub.setMemo(req.memo());
        sub.setPlanOverview(req.planOverview());
        sub.setPlanGoals(req.planGoals() != null ? new ArrayList<>(req.planGoals()) : new ArrayList<>());
        sub.setPlanRoadmapItems(req.planRoadmapItems() != null
                ? req.planRoadmapItems().stream().map(t -> new PlanRoadmapItem(t.title(), t.startDate(), t.endDate(), t.detail())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        sub.setPlanRoles(req.planRoles() != null
                ? req.planRoles().stream().map(r -> new PlanRole(r.loginId(), r.name(), r.role(), r.duties())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        sub.setPlanLinks(req.planLinks() != null
                ? req.planLinks().stream().map(l -> new PlanLink(l.label(), l.url())).collect(java.util.stream.Collectors.toCollection(ArrayList::new))
                : new ArrayList<>());
        sub.setPlanNotes(req.planNotes());
    }

    private String resolveType(int month) {
        if (month == 3 || month == 9) return "PLAN";
        if (month == 6 || month == 12) return "RESULT";
        return "PROGRESS";
    }

    private TeamSubmissionResponse toResponse(TeamSubmission sub) {
        return new TeamSubmissionResponse(
                sub.getId(),
                sub.getTeam().getId(),
                sub.getYear(),
                sub.getSemester(),
                sub.getMonth(),
                sub.getType(),
                sub.getStatus(),
                sub.getDate(),
                sub.getUpdatedBy(),
                sub.getPresentationPath(),
                sub.getPdfPath(),
                sub.getOtherPath(),
                sub.getMemo(),
                sub.getPlanOverview(),
                new ArrayList<>(sub.getPlanGoals()),
                sub.getPlanRoadmapItems().stream()
                        .map(t -> new PlanRoadmapItemDto(t.getTitle(), t.getStartDate(), t.getEndDate(), t.getDetail()))
                        .toList(),
                sub.getPlanRoles().stream()
                        .map(r -> new PlanRoleDto(r.getLoginId(), r.getName(), r.getRole(), r.getDuties()))
                        .toList(),
                sub.getPlanLinks().stream()
                        .map(l -> new PlanLinkDto(l.getLabel(), l.getUrl()))
                        .toList(),
                sub.getPlanNotes()
        );
    }
}
