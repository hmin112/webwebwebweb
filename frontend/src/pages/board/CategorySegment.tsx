import { motion } from "framer-motion";
import { HelpCircle, LayoutGrid, MessageCircle, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ✨ [2026-10-08] 게시판 분류 — 색·아이콘을 한곳에서 정해 목록·글쓰기·상세·홈이 같은 모양을 쓴다.
// 바탕은 모두 같은 옅은 회색(애플 기본), 색은 글씨·아이콘에만
export const CATEGORY_META: Record<string, { icon: LucideIcon; color: string; tint: string }> = {
  전체: { icon: LayoutGrid, color: "#1D1D1F", tint: "rgb(0 0 0 / 0.05)" },
  회비: { icon: Wallet, color: "#5856D6", tint: "rgb(0 0 0 / 0.05)" },
  자유: { icon: MessageCircle, color: "#0071E3", tint: "rgb(0 0 0 / 0.05)" },
  질문: { icon: HelpCircle, color: "#AF52DE", tint: "rgb(0 0 0 / 0.05)" },
};

export const categoryMeta = (cat?: string) => CATEGORY_META[cat || ""] || CATEGORY_META["자유"];

// 분류 칩 (목록·상세·홈)
export const CategoryChip = ({ category, size = "md" }: { category: string; size?: "sm" | "md" }) => {
  const m = categoryMeta(category);
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold shrink-0 ${size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-6 px-2.5 text-[12px]"}`}
      style={{ color: m.color, backgroundColor: m.tint }}
    >
      <Icon size={size === "sm" ? 11 : 12} strokeWidth={2.4} />
      {category || "일반"}
    </span>
  );
};

// 리퀴드 글라스 세그먼트 — 유리 막대 위를 흰 알약이 미끄러지고, 고른 분류는 글씨만 제 색이 된다.
// glass: 뒤에 색 번짐이 있는 화면(게시판 목록) / solid: 흰 카드 안(글쓰기)
export const CategorySegment = ({
  options, value, onChange, layoutId, variant = "glass", counts, stretch,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  layoutId: string;
  variant?: "glass" | "solid";
  counts?: Record<string, number>;
  stretch?: boolean;
}) => (
  <div
    className={`${variant === "glass" ? "glass-card" : "bg-black/[0.045] shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)]"} ${stretch ? "flex w-full" : "inline-flex"} max-w-full gap-0.5 p-1 rounded-full overflow-x-auto no-scrollbar`}
  >
    {options.map((opt) => {
      const m = categoryMeta(opt);
      const Icon = m.icon;
      const active = value === opt;
      return (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`relative ${stretch ? "flex-1" : ""} shrink-0 h-10 px-4 md:px-5 rounded-full text-[14px] font-semibold whitespace-nowrap transition-colors ${active ? "" : "text-[#1D1D1F]/55 hover:text-[#1D1D1F]"}`}
          style={active ? { color: m.color } : undefined}
        >
          {active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-[#fff] shadow-[inset_0_1px_0_rgb(255_255_255),0_0_0_0.5px_rgb(0_0_0/0.06),0_2px_6px_rgb(0_0_0/0.08),0_8px_20px_rgb(30_40_80/0.06)]"
              transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
            />
          )}
          <span className="relative inline-flex items-center justify-center gap-1.5">
            <Icon size={15} strokeWidth={2.2} />
            {opt}
            {counts && counts[opt] != null && (
              <span className={`text-[12px] tabular-nums ${active ? "opacity-60" : "text-[#8E8E93]"}`}>{counts[opt]}</span>
            )}
          </span>
        </button>
      );
    })}
  </div>
);
