package kr.co.devsign.devsign_backend.dto.team;

import java.util.List;

public record TeamResponse(
        Long teamId,
        String teamName,
        String projectTitle,
        String leaderLoginId,
        int year,
        int semester,
        List<TeamMemberResponse> members,
        List<kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto> links // 2026-09-30 추가 — 팀 관련 링크
) {
}
