package kr.co.devsign.devsign_backend.dto.event;

public record EventRequest(
        String category,
        String title,
        String date,
        String location,
        String content,
        String image
) {
}
