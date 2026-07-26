package kr.co.devsign.devsign_backend.dto.attendance;

import java.time.LocalDateTime;
import java.util.List;

public record AdminAttendanceStatusResponse(
        Long sessionId,
        String code,
        String status,
        LocalDateTime startedAt,
        int remainingSeconds,
        int checkedCount,
        int totalCount,
        List<AttendanceTargetStatus> targets
) {
    public static AdminAttendanceStatusResponse empty() {
        return new AdminAttendanceStatusResponse(null, null, "NONE", null, 0, 0, 0, List.of());
    }
}
