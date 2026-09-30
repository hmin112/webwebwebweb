package kr.co.devsign.devsign_backend.dto.schedule;

import kr.co.devsign.devsign_backend.entity.ExternalSchedule;

public record ExternalScheduleResponse(
        Long id,
        String source,
        String title,
        String category,
        String startDate,
        String endDate,
        String url
) {
    public static ExternalScheduleResponse from(ExternalSchedule e) {
        return new ExternalScheduleResponse(e.getId(), e.getSource(), e.getTitle(), e.getCategory(),
                e.getStartDate() == null ? null : e.getStartDate().toString(),
                e.getEndDate() == null ? null : e.getEndDate().toString(),
                e.getUrl());
    }
}
