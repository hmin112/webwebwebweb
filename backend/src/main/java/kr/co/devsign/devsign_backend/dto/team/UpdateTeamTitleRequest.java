package kr.co.devsign.devsign_backend.dto.team;

public record UpdateTeamTitleRequest(
        String requesterLoginId,
        String projectTitle
) {
}
