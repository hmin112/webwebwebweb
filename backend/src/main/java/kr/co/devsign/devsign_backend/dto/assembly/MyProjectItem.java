package kr.co.devsign.devsign_backend.dto.assembly;

// ✨ [2026-09-30] 마이페이지 오른쪽 위 "내 프로젝트" 아이콘 하나 — 개인 프로젝트(key=PERSONAL) 또는 팀 프로젝트(key=TEAM:{teamId})
public record MyProjectItem(
        String key,
        String type,        // PERSONAL | TEAM
        String title,       // 프로젝트 명 (팀은 팀 프로젝트 제목, 없으면 팀 이름)
        String teamName,    // 팀일 때만
        int memberCount,    // 팀일 때 수락한 팀원 수
        boolean hasMaterials // 개인: 이번 학기 제출한 자료가 있는지
) {
}
