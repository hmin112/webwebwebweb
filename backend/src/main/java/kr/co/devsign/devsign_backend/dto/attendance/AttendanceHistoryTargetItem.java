package kr.co.devsign.devsign_backend.dto.attendance;

public record AttendanceHistoryTargetItem(
        String name,
        String studentId,
        String profileImage,
        boolean checkedIn
) {
}
