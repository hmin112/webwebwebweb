package kr.co.devsign.devsign_backend.dto.attendance;

public class AttendanceValidationException extends RuntimeException {

    public AttendanceValidationException(String message) {
        super(message);
    }
}
