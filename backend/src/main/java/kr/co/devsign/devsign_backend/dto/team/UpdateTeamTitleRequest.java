package kr.co.devsign.devsign_backend.dto.team;

// ✨ teamName/projectTitle 둘 다 부분 수정 지원 — null/blank인 필드는 변경하지 않음
public record UpdateTeamTitleRequest(
        String requesterLoginId,
        String teamName,
        String projectTitle
) {
}
