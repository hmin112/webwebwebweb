package kr.co.devsign.devsign_backend.dto.attendance;

public record CheckInRequest(
        String loginId,
        String code
) {
}
