package kr.co.devsign.devsign_backend.dto.team;

public record TeamInvitationResponse(
        Long teamMemberId,
        Long teamId,
        String teamName,
        String projectTitle,
        String leaderLoginId,
        String leaderName
) {
}
