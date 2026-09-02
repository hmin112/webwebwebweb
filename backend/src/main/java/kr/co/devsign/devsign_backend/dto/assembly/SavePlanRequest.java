package kr.co.devsign.devsign_backend.dto.assembly;

public record SavePlanRequest(
        String loginId,
        String reportId,
        int year,
        int semester,
        int month,
        String memo,
        String planGoal,
        String planSchedule,
        String planTeamRoles,
        String planBudget,
        String planNotes
) {
}
