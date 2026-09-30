package kr.co.devsign.devsign_backend.dto.activity;

import java.util.List;

// ✨ [2026-09-30] 개인 활동 대시보드 — 한 학기 동안의 출석·총회 제출·OJ·회비를 한 번에.
// 비율(rate)은 0~100, 계산할 대상이 없으면 null(예: 이번 학기 출석 체크가 한 번도 없었음).
// score는 출석·총회·회비 비율 중 값이 있는 것들의 평균(관리자 활동 현황에서 쓴다).
// ✨ [2026-09-30] OJ는 빼고, 총회 제출은 마이페이지 "대표 프로젝트" 기준(대표가 팀이면 팀 공유 자료 제출)으로 센다.
public record MemberActivityResponse(
        String loginId,
        String name,
        String studentId,
        String userStatus,
        String role,
        String profileImage,
        int year,
        int semester,
        Attendance attendance,
        Assembly assembly,
        Fee fee,
        Integer score
) {
    public record Attendance(int total, int attended, Integer rate, List<Session> sessions) {
    }

    public record Session(String title, String date, boolean attended) {
    }

    // basis: 어떤 프로젝트로 셌는지 — PERSONAL(개인 제출) 또는 TEAM(대표 팀의 공유 자료), projectTitle/teamName은 표시용
    public record Assembly(int due, int submitted, Integer rate, List<Month> months,
                           String basis, String projectTitle, String teamName) {
    }

    // status: SUBMITTED / DRAFT / NOT_SUBMITTED
    // due: 제출률 계산에 들어가는 달(기간이 끝났거나, 진행 중이지만 이미 낸 달), open: 지금 제출 기간 중인 달
    public record Month(int month, String status, boolean due, boolean open) {
    }

    public record Fee(int due, int paid, Integer rate, List<FeeMonth> months) {
    }

    // target=false면 그 달 회비 명단에 없음(대상 아님)
    public record FeeMonth(int month, boolean target, boolean paid, boolean due) {
    }
}
