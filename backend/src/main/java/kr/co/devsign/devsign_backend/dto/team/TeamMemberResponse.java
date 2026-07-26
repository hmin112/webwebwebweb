package kr.co.devsign.devsign_backend.dto.team;

public record TeamMemberResponse(
        Long teamMemberId,
        String loginId,
        String name,
        String studentId,
        String profileImage,
        String status,
        boolean isLeader
) {
}
