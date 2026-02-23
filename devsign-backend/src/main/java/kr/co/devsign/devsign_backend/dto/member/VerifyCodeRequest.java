package kr.co.devsign.devsign_backend.dto.member;

public record VerifyCodeRequest(
        String discordTag,
        String code
) {
}
