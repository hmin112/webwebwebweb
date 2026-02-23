package kr.co.devsign.devsign_backend.dto.event;

public record EventResponse(
        Long id,
        String category,
        String title,
        String date,
        String location,
        String content,
        String image,
        int views,
        int likes
) {
}
