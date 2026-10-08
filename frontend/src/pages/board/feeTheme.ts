// ✨ [2026-10-08] 회비 표시 — 바탕은 애플 기본 흰색·옅은 회색만 쓰고, 색은 금액 글씨에만(입금 초록, 사용 빨강)
export const FEE = {
  ink: "#1D1D1F",                 // 제목·아이콘
  tint: "rgb(0 0 0 / 0.05)",      // 아이콘 바탕
  wash: "#F5F5F7",                // 회비 칸 바탕 (애플 그룹 배경)
  accent: "#5856D6",              // 회비 분류 글씨
  income: "#248A3D",
  expense: "#D70015",
};

export const feeChipStyle = { color: FEE.accent, backgroundColor: FEE.tint };
