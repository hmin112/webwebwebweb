package kr.co.devsign.devsign_backend.dto.halloffame;

import java.util.List;

public record HallOfFameAwardResponse(
        String awardName,
        List<HallOfFameParticipantResponse> participants
) {
}
