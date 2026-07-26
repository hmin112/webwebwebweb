package kr.co.devsign.devsign_backend.dto.attendance;

public record AttendanceHistoryTargetItem(
        String loginId,
        String name,
        String studentId,
        String dept,
        String profileImage,
        boolean checkedIn
) {
}
