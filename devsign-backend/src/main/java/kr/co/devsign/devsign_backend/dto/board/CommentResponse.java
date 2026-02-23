package kr.co.devsign.devsign_backend.dto.board;

import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(
        Long id,
        String content,
        String author,
        String loginId,
        String studentId,
        String profileImage,
        String date,
        LocalDateTime createdAt,
        int likes,
        boolean likedByMe,
        boolean reply,
        List<CommentResponse> replies
) {
}
