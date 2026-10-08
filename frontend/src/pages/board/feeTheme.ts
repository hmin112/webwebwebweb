// ✨ [2026-10-08] 회비 표시 색 — 노란색 대신 초록 계열(돈·잔액), 입금은 초록, 사용은 빨강
export const FEE = {
  ink: "#1F8A43",                      // 회비 글씨·아이콘
  tint: "rgb(52 199 89 / 0.14)",       // 아이콘 바탕·칩
  wash: "rgb(52 199 89 / 0.06)",       // 넓은 바탕
  income: "#1F8A43",
  expense: "#D70015",
};

// 회비 칩 (목록·홈·상세에서 같이 씀)
export const feeChipStyle = { color: FEE.ink, backgroundColor: FEE.tint };
