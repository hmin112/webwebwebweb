package kr.co.devsign.devsign_backend.dto.attendance;

public record CheckInResponse(
        // success | wrong_code | not_target | already_checked | expired | no_active_session
        String status,
        String message
) {
}
