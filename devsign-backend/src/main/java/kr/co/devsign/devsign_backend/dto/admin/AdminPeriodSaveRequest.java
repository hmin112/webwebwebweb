package kr.co.devsign.devsign_backend.dto.admin;

public record AdminPeriodSaveRequest(
        Long id,
        Integer month,
        Integer year,
        Integer semester,
        String type,
        String startDate,
        String endDate,
        Long submittedCount,
        Long totalCount
) {
}
