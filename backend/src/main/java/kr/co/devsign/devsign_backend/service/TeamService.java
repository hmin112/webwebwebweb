package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.team.CreateTeamRequest;
import kr.co.devsign.devsign_backend.dto.team.InviteMemberRequest;
import kr.co.devsign.devsign_backend.dto.team.MyTeamStatusResponse;
import kr.co.devsign.devsign_backend.dto.team.TeamInvitationResponse;
import kr.co.devsign.devsign_backend.dto.team.TeamMemberResponse;
import kr.co.devsign.devsign_backend.dto.team.TeamResponse;
import kr.co.devsign.devsign_backend.dto.team.UpdateTeamTitleRequest;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.Team;
import kr.co.devsign.devsign_backend.entity.TeamMember;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.TeamMemberRepository;
import kr.co.devsign.devsign_backend.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TeamService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_ACCEPTED = "ACCEPTED";

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MemberRepository memberRepository;
    private final AssemblyService assemblyService;

    @Transactional
    public TeamResponse createTeam(CreateTeamRequest req) {
        String loginId = req.loginId();
        int year = req.year();
        int semester = req.semester();

        if (req.teamName() == null || req.teamName().isBlank()) {
            throw new IllegalArgumentException("팀 이름을 입력해주세요.");
        }
        if (req.projectTitle() == null || req.projectTitle().isBlank()) {
            throw new IllegalArgumentException("프로젝트 명을 입력해주세요.");
        }

        ensureNotAlreadyInTeam(loginId, year, semester);

        Team team = new Team();
        team.setTeamName(req.teamName());
        team.setProjectTitle(req.projectTitle());
        team.setLeaderLoginId(loginId);
        team.setYear(year);
        team.setSemester(semester);
        teamRepository.save(team);

        TeamMember leaderMembership = new TeamMember();
        leaderMembership.setTeam(team);
        leaderMembership.setLoginId(loginId);
        leaderMembership.setStatus(STATUS_ACCEPTED);
        leaderMembership.setRespondedAt(LocalDateTime.now());
        teamMemberRepository.save(leaderMembership);

        syncProjectTitle(loginId, year, semester, team.getProjectTitle());

        return toTeamResponse(team);
    }

    // ✨ [신규] 이번 학기에 존재하는 모든 팀 목록 (초대 대기중인 인원은 노출하지 않고 수락된 팀원만 공개)
    public List<TeamResponse> getAllTeams(int year, int semester) {
        return teamRepository.findByYearAndSemesterOrderByIdAsc(year, semester).stream()
                .map(this::toPublicTeamResponse)
                .toList();
    }

    public MyTeamStatusResponse getMyTeamStatus(String loginId, int year, int semester) {
        List<TeamMember> memberships = teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(loginId, year, semester);

        Team acceptedTeam = memberships.stream()
                .filter(m -> STATUS_ACCEPTED.equals(m.getStatus()))
                .map(TeamMember::getTeam)
                .findFirst()
                .orElse(null);

        List<TeamInvitationResponse> invitations = memberships.stream()
                .filter(m -> STATUS_PENDING.equals(m.getStatus()))
                .map(m -> {
                    Team t = m.getTeam();
                    String leaderName = memberRepository.findByLoginId(t.getLeaderLoginId())
                            .map(Member::getName)
                            .orElse(t.getLeaderLoginId());
                    return new TeamInvitationResponse(m.getId(), t.getId(), t.getTeamName(), t.getProjectTitle(), t.getLeaderLoginId(), leaderName);
                })
                .toList();

        return new MyTeamStatusResponse(acceptedTeam != null ? toTeamResponse(acceptedTeam) : null, invitations);
    }

    @Transactional
    public TeamResponse inviteMember(Long teamId, InviteMemberRequest req) {
        Team team = getTeamOrThrow(teamId);
        requireLeader(team, req.requesterLoginId());

        String targetLoginId = req.targetLoginId();
        if (targetLoginId == null || targetLoginId.isBlank()) {
            throw new IllegalArgumentException("초대할 회원을 선택해주세요.");
        }
        if (targetLoginId.equals(team.getLeaderLoginId())) {
            throw new IllegalArgumentException("이미 팀장으로 속해 있습니다.");
        }

        Member targetMember = memberRepository.findByLoginId(targetLoginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        if (teamMemberRepository.findByTeam_IdAndLoginId(teamId, targetLoginId).isPresent()) {
            throw new IllegalStateException(targetMember.getName() + " 님은 이미 초대되었거나 팀에 속해 있습니다.");
        }

        if (!teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(targetLoginId, team.getYear(), team.getSemester()).isEmpty()) {
            throw new IllegalStateException(targetMember.getName() + " 님은 이미 이번 학기 다른 팀에 속해 있거나 초대받은 상태입니다.");
        }

        TeamMember invitation = new TeamMember();
        invitation.setTeam(team);
        invitation.setLoginId(targetLoginId);
        invitation.setStatus(STATUS_PENDING);
        teamMemberRepository.save(invitation);

        return toTeamResponse(team);
    }

    @Transactional
    public TeamResponse acceptInvitation(Long teamMemberId, String loginId) {
        TeamMember membership = teamMemberRepository.findById(teamMemberId)
                .orElseThrow(() -> new IllegalArgumentException("초대 정보를 찾을 수 없습니다."));

        if (!membership.getLoginId().equals(loginId)) {
            throw new IllegalStateException("본인에게 온 초대만 수락할 수 있습니다.");
        }
        if (!STATUS_PENDING.equals(membership.getStatus())) {
            throw new IllegalStateException("이미 처리된 초대입니다.");
        }

        Team team = membership.getTeam();

        membership.setStatus(STATUS_ACCEPTED);
        membership.setRespondedAt(LocalDateTime.now());
        teamMemberRepository.save(membership);

        syncProjectTitle(loginId, team.getYear(), team.getSemester(), team.getProjectTitle());

        return toTeamResponse(team);
    }

    @Transactional
    public void declineInvitation(Long teamMemberId, String loginId) {
        TeamMember membership = teamMemberRepository.findById(teamMemberId)
                .orElseThrow(() -> new IllegalArgumentException("초대 정보를 찾을 수 없습니다."));

        if (!membership.getLoginId().equals(loginId)) {
            throw new IllegalStateException("본인에게 온 초대만 거절할 수 있습니다.");
        }
        if (!STATUS_PENDING.equals(membership.getStatus())) {
            throw new IllegalStateException("이미 처리된 초대입니다.");
        }

        teamMemberRepository.delete(membership);
    }

    @Transactional
    public void removeMember(Long teamId, String targetLoginId, String requesterLoginId) {
        Team team = getTeamOrThrow(teamId);
        TeamMember membership = teamMemberRepository.findByTeam_IdAndLoginId(teamId, targetLoginId)
                .orElseThrow(() -> new IllegalArgumentException("해당 팀원을 찾을 수 없습니다."));

        boolean isSelf = requesterLoginId.equals(targetLoginId);
        boolean requesterIsLeader = requesterLoginId.equals(team.getLeaderLoginId());

        if (targetLoginId.equals(team.getLeaderLoginId())) {
            throw new IllegalStateException("팀장은 팀을 나갈 수 없습니다. 팀 해체를 이용해주세요.");
        }
        if (!isSelf && !requesterIsLeader) {
            throw new IllegalStateException("팀장만 팀원을 내보낼 수 있습니다.");
        }

        teamMemberRepository.delete(membership);
    }

    @Transactional
    public void disbandTeam(Long teamId, String requesterLoginId) {
        Team team = getTeamOrThrow(teamId);
        requireLeader(team, requesterLoginId);

        teamMemberRepository.deleteByTeam_Id(teamId);
        teamRepository.delete(team);
    }

    // ✨ teamName/projectTitle 중 값이 채워져 온 필드만 각각 부분 수정한다.
    @Transactional
    public TeamResponse updateTitle(Long teamId, UpdateTeamTitleRequest req) {
        Team team = getTeamOrThrow(teamId);
        requireLeader(team, req.requesterLoginId());

        boolean hasTeamName = req.teamName() != null && !req.teamName().isBlank();
        boolean hasProjectTitle = req.projectTitle() != null && !req.projectTitle().isBlank();

        if (!hasTeamName && !hasProjectTitle) {
            throw new IllegalArgumentException("변경할 팀 이름 또는 프로젝트 명을 입력해주세요.");
        }

        if (hasTeamName) {
            team.setTeamName(req.teamName());
        }
        if (hasProjectTitle) {
            team.setProjectTitle(req.projectTitle());
        }
        teamRepository.save(team);

        // ✨ 프로젝트 명이 바뀐 경우에만 개인 마이페이지 프로젝트 제목을 재동기화 (팀 이름은 동기화 대상 아님)
        if (hasProjectTitle) {
            List<TeamMember> accepted = teamMemberRepository.findByTeam_IdAndStatus(teamId, STATUS_ACCEPTED);
            for (TeamMember m : accepted) {
                syncProjectTitle(m.getLoginId(), team.getYear(), team.getSemester(), team.getProjectTitle());
            }
        }

        return toTeamResponse(team);
    }

    private void ensureNotAlreadyInTeam(String loginId, int year, int semester) {
        if (!teamMemberRepository.findByLoginIdAndTeam_YearAndTeam_Semester(loginId, year, semester).isEmpty()) {
            throw new IllegalStateException("이미 이번 학기 팀에 속해 있거나 초대받은 상태입니다.");
        }
    }

    private Team getTeamOrThrow(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("팀을 찾을 수 없습니다."));
    }

    private void requireLeader(Team team, String requesterLoginId) {
        if (!team.getLeaderLoginId().equals(requesterLoginId)) {
            throw new IllegalStateException("팀장만 수행할 수 있는 작업입니다.");
        }
    }

    private void syncProjectTitle(String loginId, int year, int semester, String projectTitle) {
        assemblyService.saveProjectTitle(new SaveProjectTitleRequest(loginId, year, semester, projectTitle));
    }

    private TeamResponse toTeamResponse(Team team) {
        return toTeamResponse(team, teamMemberRepository.findByTeam_Id(team.getId()));
    }

    // ✨ [신규] 다른 팀 목록에는 수락된(ACCEPTED) 팀원만 공개 — 초대 대기중인 인원은 비공개
    private TeamResponse toPublicTeamResponse(Team team) {
        return toTeamResponse(team, teamMemberRepository.findByTeam_IdAndStatus(team.getId(), STATUS_ACCEPTED));
    }

    private TeamResponse toTeamResponse(Team team, List<TeamMember> memberships) {
        List<TeamMemberResponse> members = memberships.stream()
                .map(m -> {
                    Optional<Member> memberInfo = memberRepository.findByLoginId(m.getLoginId());
                    return new TeamMemberResponse(
                            m.getId(),
                            m.getLoginId(),
                            memberInfo.map(Member::getName).orElse(m.getLoginId()),
                            memberInfo.map(Member::getStudentId).orElse(""),
                            memberInfo.map(Member::getProfileImage).orElse(null),
                            m.getStatus(),
                            m.getLoginId().equals(team.getLeaderLoginId())
                    );
                })
                .toList();

        return new TeamResponse(
                team.getId(),
                team.getTeamName() != null ? team.getTeamName() : team.getProjectTitle(),
                team.getProjectTitle(),
                team.getLeaderLoginId(),
                team.getYear(),
                team.getSemester(),
                members
        );
    }
}
