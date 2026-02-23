package kr.co.devsign.devsign_backend.dto.member;

public record MemberResponse(
        Long id,
        String loginId,
        String name,
        String studentId,
        String dept,
        String interests,
        String discordTag,
        String userStatus,
        String role,
        boolean suspended,
        String profileImage
) {
}
