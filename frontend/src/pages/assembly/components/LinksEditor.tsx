import { Link2, Plus, X } from "lucide-react";
import { CARD, SectionTitle } from "../assemblyUi";

export type LinkRow = { label: string; url: string };

// ✨ [2026-09-30] 관련 링크(Git/Notion 등) 편집 — 마이페이지(개인)와 팀 프로젝트(팀)에서 같이 쓴다.
// 계획서에는 더 이상 링크 칸이 없다.
export const LinksEditor = ({
  links,
  onChange,
  onSave,
  saving,
  hint,
  disabled,
}: {
  links: LinkRow[];
  onChange: (links: LinkRow[]) => void;
  onSave: () => void;
  saving: boolean;
  hint: string;
  disabled?: boolean;
}) => {
  const update = (idx: number, field: keyof LinkRow, value: string) =>
    onChange(links.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  return (
    <>
      <SectionTitle
        right={
          !disabled && (
            <button
              onClick={onSave}
              disabled={saving}
              className="h-8 px-3.5 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] disabled:opacity-50 transition-colors"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          )
        }
      >
        관련 링크
      </SectionTitle>
      <div className={`${CARD} rounded-3xl p-4 md:p-5`}>
        <p className="text-xs text-[#8E8E93] mb-3 px-1 flex items-center gap-1.5"><Link2 size={13} /> {hint}</p>
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => update(idx, "label", e.target.value)}
                disabled={disabled}
                placeholder="이름"
                className="w-24 md:w-36 shrink-0 h-10 px-3 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-semibold text-sm text-[#1D1D1F] disabled:opacity-60"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => update(idx, "url", e.target.value)}
                disabled={disabled}
                placeholder="https://..."
                className="flex-1 min-w-0 h-10 px-3 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 text-sm text-[#1D1D1F] disabled:opacity-60"
              />
              {!disabled && (
                <button onClick={() => onChange(links.filter((_, i) => i !== idx))} aria-label="링크 삭제" className="w-8 h-8 rounded-full flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.06] shrink-0 transition-colors">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {!disabled && (
          <button onClick={() => onChange([...links, { label: "", url: "" }])} className="flex items-center gap-1 mt-3 px-1 text-xs font-semibold text-[#0071E3] hover:underline">
            <Plus size={13} /> 링크 추가
          </button>
        )}
      </div>
    </>
  );
};
