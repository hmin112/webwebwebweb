import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ✨ [2026-09-30] 작은 달력 — 브라우저 기본 날짜 선택창은 코드로 닫을 수 없어서(버튼을 다시 눌러도 안 닫힘)
// 직접 그리는 달력. marked에 있는 날짜는 아래에 점을 찍는다(예: 로그가 있는 날).
const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const MiniCalendar = ({
  value,
  max,
  marked,
  onSelect,
}: {
  value?: string | null;
  max?: string;
  marked?: Set<string>;
  onSelect: (date: string) => void;
}) => {
  const base = value ? new Date(value + "T00:00:00") : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view]);

  const move = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const nextDisabled = max ? toStr(view.y, view.m + 1, 1) > max : false;

  return (
    <div className="w-[260px] p-3 bg-[#fff] rounded-2xl border border-black/[0.08] shadow-[0_12px_32px_rgb(0_0_0/0.14)] select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <button type="button" onClick={() => move(-1)} aria-label="이전 달" className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-black/[0.05]">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[#1D1D1F]">{view.y}년 {view.m + 1}월</span>
        <button type="button" onClick={() => move(1)} disabled={nextDisabled} aria-label="다음 달" className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-black/[0.05] disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#8E8E93] mb-1">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const ds = toStr(view.y, view.m, d);
          const disabled = Boolean(max && ds > max);
          const selected = ds === value;
          return (
            <button
              key={ds}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(ds)}
              className={`relative h-8 rounded-lg text-xs font-semibold transition-colors ${
                selected ? "bg-[#0071E3] text-white" : disabled ? "text-[#D1D1D6]" : "text-[#1D1D1F] hover:bg-black/[0.05]"
              }`}
            >
              {d}
              {marked?.has(ds) && !selected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0071E3]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
