package kr.co.devsign.devsign_backend.dto.notice;

import java.time.LocalDateTime;
import java.util.List;

public record NoticeResponse(
        Long id,
        String tag,
        String category,
        String title,
        String content,
        String author,
        int views,
        String date,
        List<String> images,
        boolean important,
        boolean pinned,
        LocalDateTime createdAt
) {
}
