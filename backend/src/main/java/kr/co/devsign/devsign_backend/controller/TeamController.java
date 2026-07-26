package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.team.CreateTeamRequest;
import kr.co.devsign.devsign_backend.dto.team.InviteMemberRequest;
import kr.co.devsign.devsign_backend.dto.team.MyTeamStatusResponse;
import kr.co.devsign.devsign_backend.dto.team.TeamResponse;
import kr.co.devsign.devsign_backend.dto.team.UpdateTeamTitleRequest;
import kr.co.devsign.devsign_backend.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<?> createTeam(@RequestBody CreateTeamRequest request) {
        try {
            return ResponseEntity.ok(teamService.createTeam(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
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
    public ResponseEntity<?> inviteMember(@PathVariable Long teamId, @RequestBody InviteMemberRequest request) {
        try {
            return ResponseEntity.ok(teamService.inviteMember(teamId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/{teamId}/title")
    public ResponseEntity<?> updateTitle(@PathVariable Long teamId, @RequestBody UpdateTeamTitleRequest request) {
        try {
            return ResponseEntity.ok(teamService.updateTitle(teamId, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/invitations/{teamMemberId}/accept")
    public ResponseEntity<?> acceptInvitation(@PathVariable Long teamMemberId, @RequestParam String loginId) {
        try {
            return ResponseEntity.ok(teamService.acceptInvitation(teamMemberId, loginId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/invitations/{teamMemberId}/decline")
    public ResponseEntity<?> declineInvitation(@PathVariable Long teamMemberId, @RequestParam String loginId) {
        try {
            teamService.declineInvitation(teamMemberId, loginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}/members/{targetLoginId}")
    public ResponseEntity<?> removeMember(
            @PathVariable Long teamId,
            @PathVariable String targetLoginId,
            @RequestParam String requesterLoginId
    ) {
        try {
            teamService.removeMember(teamId, targetLoginId, requesterLoginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<?> disbandTeam(@PathVariable Long teamId, @RequestParam String requesterLoginId) {
        try {
            teamService.disbandTeam(teamId, requesterLoginId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }
}
