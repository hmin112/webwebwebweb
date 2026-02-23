package kr.co.devsign.devsign_backend.dto.board;

import java.util.List;

public record UpdatePostRequest(
        String title,
        String content,
        String category,
        List<String> images
) {
}
