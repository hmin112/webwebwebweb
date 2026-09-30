import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronRight, X } from "lucide-react";

// ✨ [2026-09-30] 총회 탭 공통 UI — 애플 스타일(흰 카드 + 얇은 테두리 + 옅은 그림자, #1D1D1F / #6E6E73 글자, #0071E3 강조).
// 전역 CSS(.apple-app main .bg-white → 유리)에 걸리지 않도록 흰색은 bg-[#fff] 임의값을 쓴다.

export const CARD = "bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)]";

// 달별 자료 종류 — 3·9월 계획서, 6·12월 결과 보고, 나머지 진행 보고 (PLAN/PROGRESS/RESULT 배지 대신 한글로)
export const reportKind = (month: number) =>
  month === 3 || month === 9 ? "계획서" : month === 6 || month === 12 ? "결과 보고" : "진행 보고";

export type SubmitState = "done" | "open" | "past" | "upcoming";

export const isSubmittedStatus = (status?: string) => status === "SUBMITTED" || status === "제출완료";

export const submitStateOf = (r: { status?: string; isWithinPeriod?: boolean; isPast?: boolean }): SubmitState =>
  isSubmittedStatus(r.status) ? "done" : r.isWithinPeriod ? "open" : r.isPast ? "past" : "upcoming";

const STATE_STYLE: Record<SubmitState, { label: string; cls: string; dot: string }> = {
  done: { label: "제출 완료", cls: "bg-[#34C759]/10 text-[#248A3D]", dot: "bg-[#34C759]" },
  open: { label: "제출 가능", cls: "bg-[#0071E3]/10 text-[#0071E3]", dot: "bg-[#0071E3]" },
  past: { label: "마감", cls: "bg-[#FF3B30]/[0.08] text-[#D70015]", dot: "bg-[#FF3B30]" },
  upcoming: { label: "예정", cls: "bg-black/[0.05] text-[#6E6E73]", dot: "bg-[#AEAEB2]" },
};

export const StatusBadge = ({ state, label }: { state: SubmitState; label?: string }) => {
  const s = STATE_STYLE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label || s.label}
    </span>
  );
};

const shortDate = (d?: string) => (d ? d.replace(/^\d{4}[-.]/, "").replace(/-/g, ".") : "");

// 달 카드 — 마이 페이지·팀 공유 자료에서 공통으로 사용
export const MonthCard = ({
  month,
  title,
  state,
  date,
  startDate,
  endDate,
  extra,
  onClick,
  onDelete,
}: {
  month: number;
  title?: string;
  state: SubmitState;
  date?: string;
  startDate?: string;
  endDate?: string;
  extra?: string;
  onClick?: () => void;
  // ✨ [2026-09-30] 있으면 카드 오른쪽 위 모서리에 삭제(X) 버튼 — 마이페이지에서 제출 기간 중 내가 올린 자료만
  onDelete?: () => void;
}) => {
  const kind = reportKind(month);
  const heading = state === "done" && title ? title : state === "done" ? `${kind} 제출됨` : `${kind} 미제출`;
  const sub =
    state === "done"
      ? `${date || "최근"} 제출${extra ? ` · ${extra}` : ""}`
      : state === "open"
        ? endDate ? `${shortDate(endDate)}까지 제출할 수 있어요` : "지금 제출할 수 있어요"
        : state === "past"
          ? "제출 기간이 끝났어요"
          : startDate ? `${shortDate(startDate)}부터 제출할 수 있어요` : "제출 기간이 아직 정해지지 않았어요";
  return (
    <motion.div
      className="relative"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
    <button
      type="button"
      onClick={onClick}
      className={`${CARD} group w-full text-left rounded-2xl md:rounded-3xl p-4 md:p-5 flex items-center gap-4 hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)] transition-shadow`}
    >
      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
        state === "done" ? "bg-[#34C759]/10" : state === "open" ? "bg-[#0071E3]/10" : "bg-black/[0.04]"
      }`}>
        <span className={`text-base md:text-lg font-bold leading-none tracking-[-0.02em] whitespace-nowrap ${
          state === "done" ? "text-[#248A3D]" : state === "open" ? "text-[#0071E3]" : "text-[#6E6E73]"
        }`}>{month}월</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] md:text-xs font-semibold text-[#6E6E73]">{kind}</span>
          <StatusBadge state={state} />
        </div>
        <p className="text-[15px] md:text-base font-semibold text-[#1D1D1F] truncate tracking-[-0.01em]">{heading}</p>
        <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#8E8E93] shrink-0 transition-colors" />
    </button>
    {onDelete && (
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${month}월 ${kind} 삭제`}
        title={`${month}월 ${kind} 삭제`}
        className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#fff] border border-black/[0.08] shadow-[0_1px_3px_rgb(0_0_0/0.12)] flex items-center justify-center text-[#8E8E93] hover:text-[#FF3B30] hover:border-[#FF3B30]/30 transition-colors"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    )}
    </motion.div>
  );
};

// 탭 머리말 — 제목 + 설명 + 오른쪽 도구
export const PageHeader = ({ title, desc, right }: { title: string; desc?: ReactNode; right?: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
    <div className="min-w-0">
      <h1 className="text-[28px] md:text-[34px] font-bold text-[#1D1D1F] tracking-[-0.02em] leading-tight">{title}</h1>
      {desc && <p className="text-sm md:text-[15px] text-[#6E6E73] mt-1.5">{desc}</p>}
    </div>
    {right && <div className="shrink-0">{right}</div>}
  </div>
);

// 학기 선택 — 흰 알약 모양 select
export const TermSelect = ({
  value,
  options,
  onChange,
}: {
  value: { year: number; semester: number };
  options: { year: number; semester: number }[];
  onChange: (v: { year: number; semester: number }) => void;
}) => (
  // ✨ [2026-09-30] 알약 전체(화살표 포함)가 눌리도록 — 투명한 select를 알약 전체에 덮고, 글자는 따로 표시
  <label className={`${CARD} relative inline-flex items-center h-10 pl-4 pr-9 rounded-full cursor-pointer`}>
    <span className="text-sm font-semibold text-[#1D1D1F] whitespace-nowrap pointer-events-none">{value.year}년 {value.semester}학기</span>
    <select
      value={`${value.year}-${value.semester}`}
      onChange={(e) => {
        const [y, s] = e.target.value.split("-").map(Number);
        onChange({ year: y, semester: s });
      }}
      aria-label="학기 선택"
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
    >
      {options.map((o) => (
        <option key={`${o.year}-${o.semester}`} value={`${o.year}-${o.semester}`}>{o.year}년 {o.semester}학기</option>
      ))}
    </select>
    <svg className="absolute right-3.5 w-3.5 h-3.5 text-[#8E8E93] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
  </label>
);

// 섹션 소제목
export const SectionTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3 mb-3 md:mb-4 px-1">
    <h2 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em]">{children}</h2>
    {right}
  </div>
);
