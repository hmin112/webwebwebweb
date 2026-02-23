package kr.co.devsign.devsign_backend.dto.member;

public record VerifyIdPwRequest(
        String name,
        String studentId,
        String code
) {
}
