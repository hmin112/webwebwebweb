package kr.co.devsign.devsign_backend.dto.board;

import java.util.List;

public record CreatePostRequest(
        String title,
        String content,
        String category,
        List<String> images
) {
}
