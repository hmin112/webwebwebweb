package kr.co.devsign.devsign_backend.dto.member;

public record UpdateMemberRequest(
        String dept,
        String discordTag
) {
}
