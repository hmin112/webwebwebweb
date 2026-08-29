package kr.co.devsign.devsign_backend.dto.halloffame;

public record HallOfFameParticipantResponse(
        String loginId,
        String name,
        String studentId,
        String profileImage
) {
}
