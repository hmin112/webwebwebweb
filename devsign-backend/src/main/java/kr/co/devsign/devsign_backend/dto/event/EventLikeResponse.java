package kr.co.devsign.devsign_backend.dto.event;

public record EventLikeResponse(
        String status,
        String message,
        Boolean liked,
        Integer likeCount
) {
}
