package kr.co.devsign.devsign_backend.dto.halloffame;

import java.util.List;

// multipart/form-data의 awardsJson을 읽기 위한 내부 전송 형식
public record HallOfFameAwardPayload(
        String awardName,
        List<String> participantLoginIds
) {
}
