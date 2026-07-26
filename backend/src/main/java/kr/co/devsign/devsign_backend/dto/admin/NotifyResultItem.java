package kr.co.devsign.devsign_backend.dto.admin;

public record NotifyResultItem(
        String loginId,
        String name,
        // success | not_found | error | no_discord
        String status,
        String message
) {
}
