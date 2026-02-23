package kr.co.devsign.devsign_backend.dto.admin;

public record RestoreMemberRequest(
        Long id,
        String loginId,
        String password,
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
