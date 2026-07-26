package kr.co.devsign.devsign_backend.dto.attendance;

import java.util.List;

public class AttendanceValidationException extends RuntimeException {
    private final List<AttendanceProblem> problems;

    public AttendanceValidationException(String message, List<AttendanceProblem> problems) {
        super(message);
        this.problems = problems;
    }

    public List<AttendanceProblem> getProblems() {
        return problems;
    }
}
