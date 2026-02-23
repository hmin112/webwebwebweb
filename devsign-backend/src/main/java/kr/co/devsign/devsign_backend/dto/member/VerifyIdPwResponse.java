package kr.co.devsign.devsign_backend.dto.member;

public record VerifyIdPwResponse(
        String status,
        String loginId
) {
}
