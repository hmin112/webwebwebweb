package kr.co.devsign.devsign_backend.dto.attendance;

public record AttendanceTargetInfo(
        String loginId,
        String name,
        String studentId,
        String profileImage
) {
}
