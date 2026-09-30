package kr.co.devsign.devsign_backend.dto.schedule;

public record ScheduleRequest(
        String title,
        String date,
        String endDate,
        String category,
        String location,
        String memo,
        boolean membersOnly
) {
}
