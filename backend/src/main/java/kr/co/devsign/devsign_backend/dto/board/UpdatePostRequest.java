package kr.co.devsign.devsign_backend.dto.board;

import java.util.List;

public record UpdatePostRequest(
        String title,
        String content,
        String category,
        List<String> images,
        // ✨ [신규] 회비 게시글 전용 필드 — 다른 카테고리에서는 null/빈 값
        String feeAmount,
        String feeAccount,
        String feeDeadline,
        String feeTerm
) {
}
