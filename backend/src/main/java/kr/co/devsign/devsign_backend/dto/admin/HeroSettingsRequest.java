package kr.co.devsign.devsign_backend.dto.admin;

public record HeroSettingsRequest(
        String recruitmentText,
        String applyLink,
        String applyButtonText,
        // ✨ [신규] 홈 화면 하단 연락처(회장/부회장/총무) 전화번호 — 이름/학번은 회원 정보에서
        // 자동으로 따오고, 전화번호만 관리자가 직접 입력
        String presidentPhone,
        String vicePresidentPhone,
        String treasurerPhone
) {
}
