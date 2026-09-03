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
        String date,
        // ✨ [신규] 회비 게시글 전용 필드 — 다른 카테고리에서는 null
        String feeAmount,
        String feeAccount,
        String feeDeadline,
        String feeTerm
) {
}
