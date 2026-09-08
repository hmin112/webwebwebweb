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
        String profileImage,
        boolean departed // 2026-09-08 추가 — 커뮤니티에서 이 값이 true인 회원은 목록에서 숨김(프론트 필터)
) {
}
