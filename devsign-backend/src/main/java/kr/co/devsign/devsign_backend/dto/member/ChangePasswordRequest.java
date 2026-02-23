package kr.co.devsign.devsign_backend.dto.member;

public record ChangePasswordRequest(
        String currentPassword,
        String newPassword
) {
}
