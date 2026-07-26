package kr.co.devsign.devsign_backend.dto.attendance;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceStartResponse(
        Long sessionId,
        String code,
        LocalDateTime startedAt,
        int durationSeconds,
        List<AttendanceTargetInfo> targets
) {
}
