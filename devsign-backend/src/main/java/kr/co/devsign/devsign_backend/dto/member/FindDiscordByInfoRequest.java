package kr.co.devsign.devsign_backend.dto.member;

public record FindDiscordByInfoRequest(
        String name,
        String studentId
) {
}
