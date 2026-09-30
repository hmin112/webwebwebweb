package kr.co.devsign.devsign_backend.dto.team;

import kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto;

import java.util.List;

// ✨ [2026-09-30] 팀 관련 링크(Git/Notion 등) 저장 — 계획서에서 링크를 빼고 팀 탭에서 따로 관리한다
public record SaveTeamLinksRequest(
        String requesterLoginId,
        List<PlanLinkDto> links
) {
}
