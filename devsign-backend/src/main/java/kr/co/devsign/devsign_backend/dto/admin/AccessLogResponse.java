package kr.co.devsign.devsign_backend.dto.admin;

import java.time.LocalDateTime;

public record AccessLogResponse(
        Long id,
        String name,
        String studentId,
        String type,
        String ip,
        LocalDateTime timestamp
) {
}
