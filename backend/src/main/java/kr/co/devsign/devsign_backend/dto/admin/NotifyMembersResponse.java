package kr.co.devsign.devsign_backend.dto.admin;

import java.util.List;

public record NotifyMembersResponse(
        int successCount,
        int failCount,
        List<NotifyResultItem> results
) {
}
