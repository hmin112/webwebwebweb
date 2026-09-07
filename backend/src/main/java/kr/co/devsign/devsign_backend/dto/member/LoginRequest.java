package kr.co.devsign.devsign_backend.dto.member;

public record LoginRequest(
        String loginId,
        String password,
        boolean rememberMe // 자동 로그인 체크 여부 — 체크 안 하면 JwtUtil이 짧은(1시간) 토큰을 발급함
) {
}
