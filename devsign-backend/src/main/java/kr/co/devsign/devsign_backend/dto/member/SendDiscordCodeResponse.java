package kr.co.devsign.devsign_backend.dto.member;

public record SendDiscordCodeResponse(
        String status,
        String message,
        String name,
        String studentId,
        String userStatus,
        String role,
        String avatarUrl
) {
}
