package kr.co.devsign.devsign_backend.dto.team;

import java.util.List;

public record TeamResponse(
        Long teamId,
        String teamName,
        String projectTitle,
        String leaderLoginId,
        int year,
        int semester,
        List<TeamMemberResponse> members
) {
}
