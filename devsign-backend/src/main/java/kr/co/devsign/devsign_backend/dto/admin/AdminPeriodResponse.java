package kr.co.devsign.devsign_backend.dto.admin;

public record AdminPeriodResponse(
        Long id,
        int month,
        int year,
        int semester,
        String type,
        String startDate,
        String endDate,
        long submittedCount,
        long totalCount
) {
}
