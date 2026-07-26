package kr.co.devsign.devsign_backend.dto.attendance;

import java.time.LocalDateTime;

public record AttendanceTargetStatus(
        String loginId,
        String name,
        String studentId,
        String profileImage,
        boolean checkedIn,
        LocalDateTime checkedInAt
) {
}
