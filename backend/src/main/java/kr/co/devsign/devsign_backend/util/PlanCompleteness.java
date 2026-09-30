package kr.co.devsign.devsign_backend.util;

import kr.co.devsign.devsign_backend.entity.PlanRoadmapItem;
import org.springframework.util.StringUtils;

import java.util.List;

// ✨ [2026-09-30] 웹 계획서의 필수 항목이 모두 채워졌는지 — 계획서 편집기(AssemblyPlanPage/TeamPlanPage)의 제출 버튼 조건과 같다.
// 배경 및 목표 개요, 핵심 목표 2개 이상, 로드맵 1개 이상(모두 제목·시작일·종료일, 시작일 ≤ 종료일). 개인 계획서는 프로젝트 명도.
// 제출한 뒤 내용을 지워 하나라도 비면 "제출됨"이 아니라 미제출(작성 중)로 되돌린다.
public final class PlanCompleteness {

    public static final int MIN_GOALS = 2;
    public static final String MISSING_MESSAGE =
            "필수 항목(프로젝트 명·배경 및 목표 개요·핵심 목표 2개 이상·로드맵)을 모두 채워야 제출할 수 있어요.";

    private PlanCompleteness() {
    }

    public static boolean isComplete(String overview, List<String> goals, List<PlanRoadmapItem> roadmap) {
        if (!StringUtils.hasText(overview)) return false;
        long goalCount = goals == null ? 0 : goals.stream().filter(StringUtils::hasText).count();
        if (goalCount < MIN_GOALS) return false;
        if (roadmap == null || roadmap.isEmpty()) return false;
        return roadmap.stream().allMatch(r -> r != null
                && StringUtils.hasText(r.getTitle())
                && StringUtils.hasText(r.getStartDate())
                && StringUtils.hasText(r.getEndDate())
                && r.getStartDate().compareTo(r.getEndDate()) <= 0);
    }
}
