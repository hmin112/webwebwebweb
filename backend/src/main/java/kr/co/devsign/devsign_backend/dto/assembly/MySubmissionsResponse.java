package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

public record MySubmissionsResponse(
        List<AssemblyReportResponse> reports,
        String projectTitle,
        List<PlanLinkDto> projectLinks, // 2026-09-07 추가 — 마이페이지/커뮤니티 공용 학기별 깃/노션 링크
        RepresentativeProject representative // 2026-09-30 추가 — 커뮤니티에 보이는 대표 프로젝트(개인/팀)
) {
}
