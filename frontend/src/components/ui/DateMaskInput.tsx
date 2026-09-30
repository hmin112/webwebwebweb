// ✨ [2026-09-30] 날짜 입력칸 — 숫자만 치면 2026.04.27 모양으로 점이 자동으로 들어가고, 남은 자리는 흐린 YYYY.MM.DD로 보인다.
// 행사 작성·캘린더 일정에서 같이 쓴다. 작성 화면(.write-page) 안에서 쓰는 걸 기준으로 스타일을 맞췄다.

export const DATE_MASK = "YYYY.MM.DD";

export const formatDateInput = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join(".");
};

export const normalizeDate = (raw?: string) => {
  const m = (raw || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}.${m[2].padStart(2, "0")}.${m[3].padStart(2, "0")}` : formatDateInput(raw || "");
};

export const isValidDate = (v: string) => {
  const m = v.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
};

// "2026.04.27" 또는 "2026.04.27 ~ 2026.04.29" → [시작, 끝]
export const splitDateRange = (raw?: string): [string, string] => {
  const parts = (raw || "").split(/\s*[~〜]\s*/);
  const start = normalizeDate(parts[0]);
  const end = parts[1] ? normalizeDate(/^\d{4}/.test(parts[1].trim()) ? parts[1] : `${start.slice(0, 4)}.${parts[1]}`) : "";
  return [start, end];
};

export const DateMaskInput = ({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  size?: "md" | "lg";
}) => {
  const pad = size === "lg" ? "px-6 h-14 text-base" : "px-4 h-12 text-[15px]";
  return (
    <div className={`relative bg-slate-50 ${size === "lg" ? "rounded-2xl" : "rounded-xl"} focus-within:bg-[#fff] focus-within:shadow-[0_0_0_1px_rgb(0_113_227/0.45),0_0_0_4px_rgb(0_113_227/0.12)] transition-all`}>
      <div aria-hidden className={`absolute inset-0 ${pad} flex items-center font-semibold tabular-nums pointer-events-none whitespace-pre`}>
        <span className="invisible">{value}</span>
        <span className="text-[#C7C7CC]">{DATE_MASK.slice(value.length)}</span>
      </div>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(formatDateInput(e.target.value))}
        className={`bare-field relative w-full ${pad} bg-transparent font-semibold tabular-nums outline-none`}
      />
    </div>
  );
};
