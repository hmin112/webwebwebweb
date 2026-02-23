package kr.co.devsign.devsign_backend.dto.member;

public record LoginResponse(
        String status,
        String message,
        String token,
        String role,
        String userStatus,
        String name,
        String loginId,
        String studentId,
        String dept,
        String discordTag,
        String avatarUrl
) {
}
