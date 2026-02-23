package kr.co.devsign.devsign_backend.dto.notice;

import java.util.List;

public record NoticeRequest(
        String title,
        String content,
        String category,
        List<String> images,
        Boolean important
) {
}
