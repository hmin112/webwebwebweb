package kr.co.devsign.devsign_backend.dto.halloffame;

public record HallOfFameRequest(
        String competitionName,
        String awardName,
        String title,
        String content,
        String date,
        String image, // 수정 시 새 파일이 없으면 기존 이미지 URL 유지용
        String awardsJson // 상별 수상자 목록(JSON). 기존 단일 수상 데이터와 호환되도록 선택값이다.
) {
}
