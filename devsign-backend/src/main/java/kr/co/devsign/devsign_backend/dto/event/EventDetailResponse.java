package kr.co.devsign.devsign_backend.dto.event;

public record EventDetailResponse(
        EventResponse event,
        boolean isLiked
) {
}
