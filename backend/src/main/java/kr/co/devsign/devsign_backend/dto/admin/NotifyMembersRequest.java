package kr.co.devsign.devsign_backend.dto.admin;

import java.util.List;

public record NotifyMembersRequest(
        List<String> loginIds,
        String message
) {
}
