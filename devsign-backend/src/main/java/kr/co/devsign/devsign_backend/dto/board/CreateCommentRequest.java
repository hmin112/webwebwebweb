package kr.co.devsign.devsign_backend.dto.board;

public record CreateCommentRequest(
        String content,
        Long parentId
) {
}
