package kr.co.devsign.devsign_backend.dto.team;

import java.util.List;

public record MyTeamStatusResponse(
        TeamResponse team,
        List<TeamInvitationResponse> pendingInvitations
) {
}
