package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

// 계획서 파일에서 양식 기준으로 뽑아낸 내용 — 저장되지 않은 "초안"으로 프론트 폼에 채워진다
public record ExtractedPlanDto(
        String projectTitle,
        String planOverview,
        List<String> planGoals,
        List<PlanRoadmapItemDto> planRoadmapItems,
        List<PlanRoleDto> planRoles,
        List<PlanLinkDto> planLinks,
        String planNotes
) {
}
