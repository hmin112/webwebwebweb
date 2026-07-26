package kr.co.devsign.devsign_backend.dto.attendance;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceHistoryItem(
        Long sessionId,
        String title,
        LocalDateTime startedAt,
        LocalDateTime closedAt,
        int checkedCount,
        int totalCount,
        List<AttendanceHistoryTargetItem> targets
) {
}
