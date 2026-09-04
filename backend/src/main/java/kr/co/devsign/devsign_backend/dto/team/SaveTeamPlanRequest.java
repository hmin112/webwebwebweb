package kr.co.devsign.devsign_backend.dto.team;

import kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto;

import java.util.List;

public record SaveTeamPlanRequest(
        String loginId,       // 요청자(팀원 권한 확인용)
        Long teamId,
        String submissionId,
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
