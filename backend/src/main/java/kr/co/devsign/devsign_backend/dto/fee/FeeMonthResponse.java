package kr.co.devsign.devsign_backend.dto.fee;

import java.util.List;

// ✨ [2026-09-09 신규] 관리 탭 "회비" 화면 한 달치 데이터.
// 명단은 그 달에 고정된 기록(fee_record)만 보고 만든다 — 현재 회원 상태로 다시 계산하지 않는다.
public record FeeMonthResponse(
        int year,
        int month,
        int freshmanAmount,
        int attendingAmount,
        boolean rosterReady,   // 그 달 명단이 만들어져 있는지 (지난 달을 처음 열면 false)
        int totalCount,
        int paidCount,
        long collectedAmount,
        List<FeeMemberResponse> members
) {
    public record FeeMemberResponse(
            String loginId,
            String name,
            String studentId,
            String userStatus,  // 그 달 기준 상태
            String discordTag,  // 발송용이라 현재 값을 조회해서 넣음 (탈퇴 시 null)
            boolean paid,
            boolean former      // 지금은 회비 대상이 아닌 사람 (탈퇴 / 상태 변경 등)
    ) {}
}
