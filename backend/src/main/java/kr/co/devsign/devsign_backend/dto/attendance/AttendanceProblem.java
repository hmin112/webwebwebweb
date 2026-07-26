package kr.co.devsign.devsign_backend.dto.attendance;

public record AttendanceProblem(
        int row,
        String name,
        String reason
) {
}
