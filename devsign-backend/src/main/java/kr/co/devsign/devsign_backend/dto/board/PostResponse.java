package kr.co.devsign.devsign_backend.dto.board;

import java.time.LocalDateTime;
import java.util.List;

public record PostResponse(
        Long id,
        String title,
        String content,
        String category,
        String author,
        String loginId,
        String studentId,
        String profileImage,
        int views,
        int likes,
        boolean likedByMe,
        List<String> images,
        List<CommentResponse> commentsList,
        LocalDateTime createdAt,
        String date
) {
}
