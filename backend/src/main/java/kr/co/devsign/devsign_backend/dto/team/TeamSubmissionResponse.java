package kr.co.devsign.devsign_backend.dto.team;

import kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto;

import java.util.List;

public record TeamSubmissionResponse(
        Long id,
        Long teamId,
        int year,
        int semester,
        int month,
        String type,
        String status,
        String date,
        String updatedBy,
        String presentationPath,
        String pdfPath,
        String otherPath,
        String memo,
        String planOverview,
        List<String> planGoals,
        List<PlanRoadmapItemDto> planRoadmapItems,
        List<PlanRoleDto> planRoles,
        List<PlanLinkDto> planLinks,
        String planNotes
) {
}
