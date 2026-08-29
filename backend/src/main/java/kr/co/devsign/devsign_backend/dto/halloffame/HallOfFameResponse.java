package kr.co.devsign.devsign_backend.dto.halloffame;

import java.time.LocalDateTime;
import java.util.List;

public record HallOfFameResponse(
        Long id,
        String competitionName,
        String awardName,
        String title,
        String content,
        String date,
        String image,
        List<HallOfFameParticipantResponse> participants,
        LocalDateTime createdAt
) {
}
