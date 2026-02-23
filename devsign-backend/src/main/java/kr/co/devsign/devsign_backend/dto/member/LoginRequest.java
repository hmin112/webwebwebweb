package kr.co.devsign.devsign_backend.dto.member;

public record LoginRequest(
        String loginId,
        String password
) {
}
