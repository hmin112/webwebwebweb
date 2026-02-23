package kr.co.devsign.devsign_backend.dto.member;

public record ResetPasswordFinalRequest(
        String name,
        String studentId,
        String newPassword
) {
}
