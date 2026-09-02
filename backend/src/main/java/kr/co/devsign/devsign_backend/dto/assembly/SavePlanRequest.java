package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

public record SavePlanRequest(
        String loginId,
        String reportId,
        int year,
        int semester,
        int month,
        String memo,
        String planOverview,
        List<String> planGoals,
        List<PlanRoadmapItemDto> planRoadmapItems,
        List<PlanRoleDto> planRoles,
        List<PlanLinkDto> planLinks,
        String planNotes
) {
}
