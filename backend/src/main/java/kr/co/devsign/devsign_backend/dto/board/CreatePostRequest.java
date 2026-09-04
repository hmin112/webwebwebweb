package kr.co.devsign.devsign_backend.dto.board;

import java.util.List;

public record CreatePostRequest(
        String title,
        String content,
        String category,
        List<String> images,
        // ✨ 회비(사용 내역) 게시글 전용 필드 — 다른 카테고리에서는 null/빈 값
        String feeTerm,
        Long feeOpeningBalance,
        String feeItemsJson // List<FeeLedgerItemDto>를 JSON 문자열로 인코딩해서 전송(멀티파트라 파일과 함께 보내기 위함)
) {
}
