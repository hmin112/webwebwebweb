package kr.co.devsign.devsign_backend.dto.admin;

import java.util.List;

public record AdminPeriodZipRequest(
        List<String> userIds,
        Integer year,
        Integer month,
        String fileType
) {
}
