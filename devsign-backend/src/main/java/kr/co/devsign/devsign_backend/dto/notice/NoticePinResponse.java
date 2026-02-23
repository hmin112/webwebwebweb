package kr.co.devsign.devsign_backend.dto.notice;

public record NoticePinResponse(
        String status,
        String message,
        Boolean pinned
) {
}
