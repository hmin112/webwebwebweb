package kr.co.devsign.devsign_backend.dto.assembly;

// ✨ [2026-09-30] 커뮤니티에 보이는 부원의 대표 프로젝트. chosen=false면 본인이 고르지 않아 자동으로 정해진 것
// (팀 프로젝트가 있으면 팀, 없으면 자료를 올린 개인 프로젝트)
public record RepresentativeProject(
        String key,
        String type,
        String title,
        String teamName,
        boolean chosen
) {
}
