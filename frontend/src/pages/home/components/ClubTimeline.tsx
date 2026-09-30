import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, Crown, Flag, Pencil, Plus, Trophy, X } from "lucide-react";
import { api } from "../../../api/axios";
import { parseEventDate } from "../../../components/calendar/ClubCalendar";

// ✨ [2026-09-30 신규] DEVSIGN 연대기 — 따로 관리하지 않아도 사이트에 올라온 명예의 전당(수상)과 주요 행사가
// 날짜순으로 자동으로 쌓인다. 연도마다 기수와 그 해 임원진(회장·부회장·총무)을 함께 보여준다.
// 임원진: 올해는 부원 이름의 "(회장)" 표시로 자동 기록, 지난 해는 관리자가 연도별로 한 번 입력.

const FOUNDED_YEAR = 2010;
const ROLES = ["회장", "부회장", "총무"] as const;

type Officer = { year: number; role: string; name: string; studentId?: string | null };
type Item = {
  key: string;
  kind: "award" | "event";
  date: Date;
  dateText: string;
  title: string;
  sub?: string;
  awards?: string[];
  image?: string;
  onClick?: () => void;
};

const generationOf = (year: number) => year - FOUNDED_YEAR + 1;
const fmtMonthDay = (d: Date) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;

export const ClubTimeline = ({
  events = [],
  hallOfFame = [],
  onNavigate,
  isAdmin = false,
}: {
  events?: any[];
  hallOfFame?: any[];
  onNavigate?: (page: string, id?: number) => void;
  isAdmin?: boolean;
}) => {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [editYear, setEditYear] = useState<number | null>(null);

  const loadOfficers = () =>
    api.get("/officers/history").then((r) => setOfficers(r.data || [])).catch(() => setOfficers([]));
  useEffect(() => { loadOfficers(); }, []);

  // 명예의 전당은 상마다 게시물이 따로 있어서, 같은 대회·같은 날짜는 한 줄로 묶는다
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const groups = new Map<string, Item>();
    (hallOfFame || []).forEach((h: any) => {
      const d = parseEventDate(h.date);
      if (!d) return;
      const k = `${(h.competitionName || h.title || "").trim()}|${d.start.toDateString()}`;
      const awards: string[] = (h.awards && h.awards.length ? h.awards.map((a: any) => a.awardName) : [h.awardName]).filter(Boolean);
      const existing = groups.get(k);
      if (existing) {
        awards.forEach((a) => { if (!existing.awards!.includes(a)) existing.awards!.push(a); });
        return;
      }
      const item: Item = {
        key: `h${h.id}`,
        kind: "award",
        date: d.start,
        dateText: h.date,
        title: h.competitionName || h.title,
        awards: [...awards],
        image: h.image || undefined,
        onClick: onNavigate ? () => onNavigate("halloffame-detail", h.id) : undefined,
      };
      groups.set(k, item);
      out.push(item);
    });
    (events || []).forEach((e: any) => {
      const d = parseEventDate(e.date);
      if (!d) return;
      out.push({
        key: `e${e.id}`,
        kind: "event",
        date: d.start,
        dateText: e.date,
        title: e.title,
        sub: [e.category, e.location].filter(Boolean).join(" · "),
        image: e.image || undefined,
        onClick: onNavigate ? () => onNavigate("event-detail", e.id) : undefined,
      });
    });
    return out.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events, hallOfFame, onNavigate]);

  const years = useMemo(() => {
    const set = new Set<number>();
    items.forEach((it) => set.add(it.date.getFullYear()));
    officers.forEach((o) => set.add(o.year));
    set.add(new Date().getFullYear());
    return [...set].filter((y) => y > FOUNDED_YEAR).sort((a, b) => b - a);
  }, [items, officers]);

  const visibleYears = showAll ? years : years.slice(0, 2);
  const officersOf = (y: number) =>
    ROLES.map((r) => officers.find((o) => o.year === y && o.role === r)).filter(Boolean) as Officer[];

  return (
    <section className="py-16 md:py-24 bg-[#FAFAFC]">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12">
        <div className="flex items-end justify-between gap-4 mb-8 md:mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">DEVSIGN 연대기</h2>
            <p className="text-sm md:text-base text-[#6E6E73] mt-2">수상 기록과 주요 행사, 역대 임원진이 해마다 자동으로 쌓여요.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditYear(new Date().getFullYear() - 1)}
              className="shrink-0 inline-flex items-center gap-1 h-9 px-3.5 rounded-full bg-[#0071E3] text-white text-[13px] font-semibold hover:bg-[#0077ED] transition-colors"
            >
              <Plus size={14} /> 임원진 입력
            </button>
          )}
        </div>

        <div className="relative">
          {/* 세로 줄 */}
          <div aria-hidden className="absolute left-[15px] md:left-[119px] top-2 bottom-2 w-px bg-black/[0.08]" />

          {visibleYears.map((y) => {
            const yearItems = items.filter((it) => it.date.getFullYear() === y);
            const yearOfficers = officersOf(y);
            return (
              <motion.div
                key={y}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="relative grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] gap-x-4 md:gap-x-8 pb-10 md:pb-14"
              >
                {/* 연도 */}
                <div className="relative">
                  <span className="absolute left-[9px] md:left-auto md:right-[-7px] top-2 w-[13px] h-[13px] rounded-full bg-[#0071E3] ring-4 ring-[#FAFAFC]" />
                  <div className="hidden md:block text-right pr-6">
                    <p className="text-[28px] font-bold text-[#1D1D1F] tracking-[-0.03em] leading-none">{y}</p>
                    <p className="text-xs font-semibold text-[#8E8E93] mt-1.5">{generationOf(y)}기</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="md:hidden flex items-baseline gap-2 mb-3">
                    <p className="text-2xl font-bold text-[#1D1D1F] tracking-[-0.03em]">{y}</p>
                    <p className="text-xs font-semibold text-[#8E8E93]">{generationOf(y)}기</p>
                  </div>

                  {/* 임원진 */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {yearOfficers.map((o) => (
                      <span key={o.role} className="inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3 rounded-full bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] text-[13px]">
                        {o.role === "회장" ? <Crown size={13} className="text-[#FF9F0A]" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#AEAEB2]" />}
                        <span className="text-[#8E8E93] font-medium">{o.role}</span>
                        <span className="font-semibold text-[#1D1D1F]">{o.studentId ? `${o.studentId} ` : ""}{o.name}</span>
                      </span>
                    ))}
                    {yearOfficers.length === 0 && <span className="text-[13px] text-[#C7C7CC]">임원진 기록이 아직 없어요</span>}
                    {isAdmin && (
                      <button onClick={() => setEditYear(y)} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[12px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.08] transition-colors">
                        <Pencil size={12} /> 편집
                      </button>
                    )}
                  </div>

                  {/* 그 해 기록 */}
                  {yearItems.length > 0 ? (
                    <div className="space-y-2.5">
                      {yearItems.map((it) => (
                        <button
                          key={it.key}
                          type="button"
                          onClick={it.onClick}
                          className="w-full text-left flex items-center gap-3 md:gap-4 p-3 md:p-3.5 rounded-2xl bg-[#fff] border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)] hover:-translate-y-px transition-all"
                        >
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${it.kind === "award" ? "bg-[#FF9F0A]/[0.12] text-[#C93400]" : "bg-[#0A84FF]/10 text-[#0A84FF]"}`}>
                            {it.kind === "award" ? <Trophy size={16} /> : <CalendarDays size={16} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-[12px] font-semibold text-[#8E8E93] tabular-nums shrink-0">{fmtMonthDay(it.date)}</span>
                              <span className="text-[15px] font-semibold text-[#1D1D1F] truncate tracking-[-0.01em]">{it.title}</span>
                            </span>
                            {it.kind === "award" && it.awards && it.awards.length > 0 ? (
                              <span className="flex flex-wrap gap-1 mt-1.5">
                                {it.awards.map((a) => (
                                  <span key={a} className="inline-flex items-center h-5 px-2 rounded-full border border-[#C9A227]/60 text-[#A8841A] text-[11px] font-semibold">{a}</span>
                                ))}
                              </span>
                            ) : it.sub ? (
                              <span className="block text-xs text-[#8E8E93] mt-0.5 truncate">{it.sub}</span>
                            ) : null}
                          </span>
                          {it.image && (
                            <img src={it.image} alt="" className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover shrink-0 bg-[#F2F2F7]" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#AEAEB2]">이 해의 수상·행사 기록은 아직 없어요.</p>
                  )}
                </div>
              </motion.div>
            );
          })}

          {years.length > 2 && (
            <div className="relative grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] gap-x-4 md:gap-x-8 pb-10">
              <div />
              <div>
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="inline-flex items-center gap-1 h-9 px-4 rounded-full bg-[#fff] border border-black/[0.06] text-[13px] font-semibold text-[#1D1D1F]/80 hover:text-[#1D1D1F] transition-colors"
                >
                  {showAll ? "접기" : `이전 기록 더 보기 (${years.length - 2}년)`}
                  <ChevronDown size={14} className={`transition-transform ${showAll ? "rotate-180" : ""}`} />
                </button>
              </div>
            </div>
          )}

          {/* 창단 */}
          <div className="relative grid grid-cols-[32px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] gap-x-4 md:gap-x-8">
            <div className="relative">
              <span className="absolute left-[9px] md:left-auto md:right-[-7px] top-2 w-[13px] h-[13px] rounded-full bg-[#1D1D1F] ring-4 ring-[#FAFAFC]" />
              <div className="hidden md:block text-right pr-6">
                <p className="text-[28px] font-bold text-[#1D1D1F] tracking-[-0.03em] leading-none">{FOUNDED_YEAR}</p>
                <p className="text-xs font-semibold text-[#8E8E93] mt-1.5">1기</p>
              </div>
            </div>
            <div className="min-w-0">
              <div className="md:hidden flex items-baseline gap-2 mb-3">
                <p className="text-2xl font-bold text-[#1D1D1F] tracking-[-0.03em]">{FOUNDED_YEAR}</p>
                <p className="text-xs font-semibold text-[#8E8E93]">1기</p>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#1D1D1F] text-white">
                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Flag size={16} /></span>
                <span>
                  <span className="block text-[15px] font-semibold">DEVSIGN 창단</span>
                  <span className="block text-xs text-white/60 mt-0.5">조선대학교 IT융합대학 코딩 학술 동아리의 시작</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editYear != null && createPortal(
        <AnimatePresence>
          <OfficerEditor
            key={editYear}
            year={editYear}
            initial={officersOf(editYear)}
            onClose={() => setEditYear(null)}
            onSaved={(list) => { setOfficers(list); setEditYear(null); }}
          />
        </AnimatePresence>,
        document.querySelector("main") ?? document.body
      )}
    </section>
  );
};

// 관리자 — 한 해의 회장·부회장·총무 입력 (학번 두 자리 + 이름, 비우면 그 역할은 지워짐)
const OfficerEditor = ({ year, initial, onClose, onSaved }: {
  year: number; initial: Officer[]; onClose: () => void; onSaved: (list: Officer[]) => void;
}) => {
  const [y, setY] = useState(String(year));
  const [rows, setRows] = useState(() =>
    ROLES.map((r) => {
      const o = initial.find((x) => x.role === r);
      return { role: r, studentId: o?.studentId || "", name: o?.name || "" };
    })
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const yearNum = Number(y);
    if (!/^\d{4}$/.test(y) || yearNum < FOUNDED_YEAR) return alert("연도를 4자리로 입력해주세요. (예: 2023)");
    setSaving(true);
    try {
      const res = await api.put(`/admin/officers/${yearNum}`, rows.map((r) => ({ year: yearNum, role: r.role, name: r.name, studentId: r.studentId })));
      onSaved(res.data || []);
    } catch (e: any) {
      alert(e.response?.data?.message || "임원진을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="relative w-full max-w-md bg-[#fff] rounded-[28px] shadow-[0_20px_60px_rgb(0_0_0/0.18)]"
      >
        <div className="write-page rounded-[28px] p-6 md:p-7">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-xl font-bold text-[#1D1D1F] tracking-[-0.02em]">임원진 입력</h3>
              <p className="text-[13px] text-[#8E8E93] mt-0.5">비워둔 역할은 연대기에 표시되지 않아요.</p>
            </div>
            <button onClick={onClose} aria-label="닫기" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center hover:bg-black/[0.08] shrink-0"><X size={16} /></button>
          </div>

          <label className="block text-xs font-semibold text-[#6E6E73] mb-1.5 ml-1">연도</label>
          <input
            inputMode="numeric"
            value={y}
            onChange={(e) => setY(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full h-12 px-4 rounded-xl text-[15px] font-semibold outline-none tabular-nums mb-4"
          />

          <div className="space-y-2.5">
            {rows.map((r, i) => (
              <div key={r.role} className="grid grid-cols-[64px_72px_minmax(0,1fr)] items-center gap-2">
                <span className="text-sm font-semibold text-[#1D1D1F]">{r.role}</span>
                <input
                  inputMode="numeric"
                  placeholder="학번"
                  value={r.studentId}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, studentId: e.target.value.replace(/\D/g, "").slice(0, 2) } : x)))}
                  className="w-full h-11 px-3 rounded-xl text-sm text-center tabular-nums outline-none"
                />
                <input
                  placeholder="이름"
                  value={r.name}
                  onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  className="w-full h-11 px-3.5 rounded-xl text-sm outline-none"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={onClose} className="flex-1 h-11 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">취소</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors disabled:opacity-60">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
