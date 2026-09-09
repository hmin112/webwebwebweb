package kr.co.devsign.devsign_backend.dto.fee;

import java.util.List;

// ✨ [2026-09-09 신규] 관리 탭 "회비" 화면 한 달치 데이터 — 금액 설정 + 대상자 명단 + 집계.
// 걷힌 금액은 저장하지 않고 (납부자 × 해당 상태의 금액)으로 매번 계산한다 —
// 관리자가 나중에 금액 설정을 고쳐도 화면의 합계가 항상 설정과 일치하도록.
public record FeeMonthResponse(
        int year,
        int month,
        int freshmanAmount,
        int attendingAmount,
        int totalCount,
        int paidCount,
        long collectedAmount,
        List<FeeMemberResponse> members
) {
    public record FeeMemberResponse(
            Long id,
            String loginId,
            String name,
            String studentId,
            String userStatus,
            String discordTag,
            boolean paid
    ) {}
}
