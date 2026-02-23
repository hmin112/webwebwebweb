package kr.co.devsign.devsign_backend.dto.assembly;

public record SubmissionPeriodResponse(
        Long id,
        int month,
        int year,
        int semester,
        String type,
        String startDate,
        String endDate
) {
}
