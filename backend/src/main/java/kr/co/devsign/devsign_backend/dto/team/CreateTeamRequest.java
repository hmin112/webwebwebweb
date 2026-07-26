package kr.co.devsign.devsign_backend.dto.team;

public record CreateTeamRequest(
        String loginId,
        int year,
        int semester,
        String projectTitle
) {
}
