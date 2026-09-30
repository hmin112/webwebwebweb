package kr.co.devsign.devsign_backend.dto.schedule;

import kr.co.devsign.devsign_backend.entity.ClubSchedule;

public record ScheduleResponse(
        Long id,
        String title,
        String date,
        String endDate,
        String category,
        String location,
        String memo,
        boolean membersOnly
) {
    public static ScheduleResponse from(ClubSchedule s) {
        return new ScheduleResponse(s.getId(), s.getTitle(), s.getDate(), s.getEndDate(), s.getCategory(), s.getLocation(), s.getMemo(), s.isMembersOnly());
    }
}
