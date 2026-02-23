package kr.co.devsign.devsign_backend.dto.member;

public record VerifyCodeResponse(
        String status,
        String name,
        String studentId,
        String userStatus,
        String role
) {
}
