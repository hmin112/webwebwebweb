package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.team.CreateTeamRequest;
import kr.co.devsign.devsign_backend.dto.team.InviteMemberRequest;
import kr.co.devsign.devsign_backend.dto.team.MyTeamStatusResponse;
import kr.co.devsign.devsign_backend.dto.team.TeamResponse;
import kr.co.devsign.devsign_backend.dto.team.UpdateTeamTitleRequest;
import kr.co.devsign.devsign_backend.service.TeamService;
import kr.co.devsign.devsign_backend.config.AuthGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<?> createTeam(Authentication authentication, @RequestBody CreateTeamRequest request) {
        AuthGuard.requireSelf(authentication, request.loginId());
        try {
            return ResponseEntity.ok(teamService.createTeam(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    // ✨ [신규] 이번 학기에 존재하는 전체 팀 목록 (다른 팀 둘러보기용, 수락된 팀원만 공개)
    @GetMapping
    public ResponseEntity<List<TeamResponse>> getAllTeams(
            @RequestParam int year,
            @RequestParam int semester
    ) {
        return ResponseEntity.ok(teamService.getAllTeams(year, semester));
    }

    @GetMapping("/my")
    public ResponseEntity<MyTeamStatusResponse> getMyTeamStatus(
            @RequestParam String loginId,
            @RequestParam int year,
            @RequestParam int semester
    ) {
        return ResponseEntity.ok(teamService.getMyTeamStatus(loginId, year, semester));
    }

    @PostMapping("/{teamId}/invite")
    public ResponseEntity<?> inviteMember(Authentication authentication, @PathVariable Long teamId, @RequestBody InviteMemberRequest request) {
        AuthGuard.requireSelf(authentication, request.requesterLoginId());
        try {
            return ResponseEntity.ok(teamService.inviteMember(teamId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/{teamId}/title")
    public ResponseEntity<?> updateTitle(Authentication authentication, @PathVariable Long teamId, @RequestBody UpdateTeamTitleRequest request) {
        AuthGuard.requireSelf(authentication, request.requesterLoginId());
        try {
            return ResponseEntity.ok(teamService.updateTitle(teamId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/invitations/{teamMemberId}/accept")
    public ResponseEntity<?> acceptInvitation(Authentication authentication, @PathVariable Long teamMemberId, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        try {
            return ResponseEntity.ok(teamService.acceptInvitation(teamMemberId, loginId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/invitations/{teamMemberId}/decline")
    public ResponseEntity<?> declineInvitation(Authentication authentication, @PathVariable Long teamMemberId, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        try {
            teamService.declineInvitation(teamMemberId, loginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}/members/{targetLoginId}")
    public ResponseEntity<?> removeMember(
            Authentication authentication,
            @PathVariable Long teamId,
            @PathVariable String targetLoginId,
            @RequestParam String requesterLoginId
    ) {
        AuthGuard.requireSelf(authentication, requesterLoginId);
        try {
            teamService.removeMember(teamId, targetLoginId, requesterLoginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<?> disbandTeam(Authentication authentication, @PathVariable Long teamId, @RequestParam String requesterLoginId) {
        AuthGuard.requireSelf(authentication, requesterLoginId);
        try {
            teamService.disbandTeam(teamId, requesterLoginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }
}
