package kr.co.devsign.devsign_backend.dto.activity;

import java.util.List;

// ✨ [2026-09-30] 개인 활동 대시보드 — 한 학기 동안의 출석·총회 제출·OJ·회비를 한 번에.
// 비율(rate)은 0~100, 계산할 대상이 없으면 null(예: 이번 학기 출석 체크가 한 번도 없었음).
// score는 출석·총회·회비 비율 중 값이 있는 것들의 평균(OJ는 참고용으로 따로 보여주고 점수에는 넣지 않는다).
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
        Oj oj,
        Fee fee,
        Integer score
) {
    public record Attendance(int total, int attended, Integer rate, List<Session> sessions) {
    }

    public record Session(String title, String date, boolean attended) {
    }

    public record Assembly(int due, int submitted, Integer rate, List<Month> months) {
    }

    // status: SUBMITTED / DRAFT / NOT_SUBMITTED
    // due: 제출률 계산에 들어가는 달(기간이 끝났거나, 진행 중이지만 이미 낸 달), open: 지금 제출 기간 중인 달
    public record Month(int month, String status, boolean due, boolean open) {
    }

    // linked=false면 아직 OJ를 한 번도 열지 않아 계정이 없음. rank는 OJ에 연결된 부원 중 맞힌 문제 수 순위
    public record Oj(boolean linked, int solved, int submissions, Integer rank, int rankOf) {
    }

    public record Fee(int due, int paid, Integer rate, List<FeeMonth> months) {
    }

    // target=false면 그 달 회비 명단에 없음(대상 아님)
    public record FeeMonth(int month, boolean target, boolean paid, boolean due) {
    }
}
