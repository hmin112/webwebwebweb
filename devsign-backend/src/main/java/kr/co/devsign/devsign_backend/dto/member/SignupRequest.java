package kr.co.devsign.devsign_backend.dto.member;

public record SignupRequest(
        String loginId,
        String password,
        String dept,
        String interests,
        String authCode
) {
}
