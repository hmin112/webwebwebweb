package kr.co.devsign.devsign_backend.dto.admin;

public record AdminDiscordCheckResponse(
        Long id,
        String loginId,
        String name,
        String studentId,
        String discordTag,
        String userStatus,
        String role,
        boolean inGuild
) {
}
