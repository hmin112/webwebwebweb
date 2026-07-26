package kr.co.devsign.devsign_backend.dto.attendance;

import java.util.List;

public record AttendanceStartErrorResponse(
        String message,
        List<AttendanceProblem> problems
) {
}
