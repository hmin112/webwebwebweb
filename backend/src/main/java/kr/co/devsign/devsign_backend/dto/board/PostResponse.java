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
        // ✨ 회비(사용 내역) 게시글 전용 필드 — 다른 카테고리에서는 null
        String feeTerm,
        Long feeOpeningBalance,
        List<FeeLedgerItemDto> feeItems,
        long feeFinalBalance // 서버가 계산해서 내려주는 최종 잔액(기존 금액 + 입금 합계 - 사용 합계)
) {
}
