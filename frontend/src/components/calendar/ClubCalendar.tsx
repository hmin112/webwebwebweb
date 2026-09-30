import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { api } from "../../api/axios";

// ✨ [2026-09-30 신규] 동아리 캘린더 — 홈 "주요 행사 · 일정" 섹션과 행사 페이지에서 같이 쓴다.
// 행사(관리자가 등록한 Event)를 날짜별로 보여주고, 로그인한 부원에게는 총회 제출 시작·마감도 자동으로 넣는다.

export type CalendarItem = {
  key: string;
  title: string;
  start: Date;
  end: Date;
  kind: string; // 학술 / 친목 / 대회 / 기타 / 총회
  color: string;
  location?: string;
  eventId?: number;
};

export const KIND_COLORS: Record<string, string> = {
  학술: "#0A84FF",
  친목: "#FF9F0A",
  대회: "#FF375F",
  기타: "#8E8E93",
  총회: "#34C759",
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

// 행사 날짜 문자열 읽기 — "2026.03.18", "2026-4-27", "2026년 10월 3일", 기간 "2026.10.03 ~ 2026.10.05" / "2026.10.03 ~ 10.05" / "2026.10.03~05"
export const parseEventDate = (raw?: string): { start: Date; end: Date } | null => {
  if (!raw) return null;
  const full = /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/;
  const m = raw.match(full);
  if (!m) return null;
  const start = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(start.getTime())) return null;
  let end = start;
  const rest = raw.slice((m.index ?? 0) + m[0].length);
  const tilde = rest.match(/^\s*[~〜\-–]\s*(.*)$/);
  if (tilde) {
    const r = tilde[1];
    const f = r.match(full);
    const md = r.match(/^(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
    const d = r.match(/^(\d{1,2})(?!\d)/);
    if (f) end = new Date(Number(f[1]), Number(f[2]) - 1, Number(f[3]));
    else if (md) end = new Date(start.getFullYear(), Number(md[1]) - 1, Number(md[2]));
    else if (d) end = new Date(start.getFullYear(), start.getMonth(), Number(d[1]));
    if (isNaN(end.getTime()) || end < start) end = start;
  }
  return { start, end };
};

const reportKindOf = (month: number) =>
  month === 3 || month === 9 ? "계획서" : month === 6 || month === 12 ? "결과 보고" : "진행 보고";

// 행사 + (로그인 시) 총회 제출 기간을 캘린더 항목으로
export const useClubSchedule = (events: any[], isLoggedIn: boolean) => {
  const [periods, setPeriods] = useState<any[]>([]);
  useEffect(() => {
    if (!isLoggedIn) { setPeriods([]); return; }
    const year = new Date().getFullYear();
    let cancelled = false;
    Promise.all([year - 1, year, year + 1].map((y) => api.get(`/assembly/periods/${y}`).then((r) => r.data || []).catch(() => [])))
      .then((lists) => { if (!cancelled) setPeriods(lists.flat()); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  return useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    (events || []).forEach((e: any) => {
      const d = parseEventDate(e.date);
      if (!d) return;
      const kind = KIND_COLORS[e.category] ? e.category : "기타";
      items.push({ key: `e${e.id}`, title: e.title, start: d.start, end: d.end, kind, color: KIND_COLORS[kind], location: e.location, eventId: e.id });
    });
    periods.forEach((p: any) => {
      const s = new Date(`${p.startDate}T00:00:00`);
      const en = new Date(`${p.endDate}T00:00:00`);
      const label = `${p.month}월 ${reportKindOf(p.month)}`;
      if (!isNaN(s.getTime())) items.push({ key: `ps${p.year}-${p.month}`, title: `${label} 제출 시작`, start: s, end: s, kind: "총회", color: KIND_COLORS.총회 });
      if (!isNaN(en.getTime())) items.push({ key: `pe${p.year}-${p.month}`, title: `${label} 제출 마감`, start: en, end: en, kind: "총회", color: "#FF3B30" });
    });
    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events, periods]);
};

const itemsOnDay = (items: CalendarItem[], day: Date) => {
  const t = startOfDay(day).getTime();
  return items.filter((it) => startOfDay(it.start).getTime() <= t && t <= startOfDay(it.end).getTime());
};

export const dDay = (d: Date) => {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  return diff === 0 ? "D-DAY" : diff > 0 ? `D-${diff}` : `D+${-diff}`;
};

const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const fmtRange = (it: CalendarItem) => (sameDay(it.start, it.end) ? fmt(it.start) : `${fmt(it.start)} ~ ${fmt(it.end)}`);
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 한 줄 일정 — 색 막대 + 제목 + 날짜/장소 + D-day
export const ScheduleRow = ({ item, onOpen, showDDay = true }: { item: CalendarItem; onOpen?: (eventId: number) => void; showDDay?: boolean }) => {
  const clickable = item.eventId != null && onOpen;
  const Inner = (
    <>
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: item.color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#1D1D1F] truncate tracking-[-0.01em]">{item.title}</p>
        <p className="text-xs text-[#8E8E93] mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{fmtRange(item)}</span>
          <span className="shrink-0" style={{ color: item.color }}>· {item.kind}</span>
          {item.location && <span className="truncate flex items-center gap-0.5"><MapPin size={11} className="shrink-0" />{item.location}</span>}
        </p>
      </div>
      {showDDay && (
        <span className={`shrink-0 text-xs font-bold tabular-nums ${dDay(item.start) === "D-DAY" ? "text-[#FF3B30]" : "text-[#6E6E73]"}`}>{dDay(item.start)}</span>
      )}
    </>
  );
  return clickable ? (
    <button type="button" onClick={() => onOpen!(item.eventId!)} className="w-full text-left flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-black/[0.03] transition-colors">
      {Inner}
    </button>
  ) : (
    <div className="flex items-center gap-3 py-3 px-1">{Inner}</div>
  );
};

// 월 달력 — 날짜에 색 점, 누르면 선택(onSelect)
export const MonthCalendar = ({
  items,
  selected,
  onSelect,
  large = false,
}: {
  items: CalendarItem[];
  selected: Date | null;
  onSelect: (d: Date | null) => void;
  large?: boolean;
}) => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [dir, setDir] = useState(0);
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = first.getDay();
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: startPad }, () => null);
    for (let d = 1; d <= days; d++) out.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const move = (delta: number) => {
    setDir(delta);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    onSelect(null);
  };
  const isThisMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className={`${large ? "text-2xl" : "text-xl"} font-bold text-[#1D1D1F] tracking-[-0.02em]`}>
          {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
        </p>
        <div className="flex items-center gap-1">
          {!isThisMonth && (
            <button onClick={() => { setDir(0); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); onSelect(null); }} className="h-8 px-3 rounded-full text-[13px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.08] transition-colors">
              오늘
            </button>
          )}
          <button onClick={() => move(-1)} aria-label="이전 달" className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F]/70 hover:bg-black/[0.05] transition-colors"><ChevronLeft size={18} /></button>
          <button onClick={() => move(1)} aria-label="다음 달" className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F]/70 hover:bg-black/[0.05] transition-colors"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEK.map((w, i) => (
          <span key={w} className={`text-center text-[11px] font-semibold pb-2 ${i === 0 ? "text-[#FF3B30]/80" : i === 6 ? "text-[#0A84FF]/80" : "text-[#8E8E93]"}`}>{w}</span>
        ))}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
          initial={{ opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-7 gap-y-1"
        >
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const dayItems = itemsOnDay(items, d);
            const isToday = sameDay(d, today);
            const isSel = selected != null && sameDay(d, selected);
            const dow = d.getDay();
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(isSel ? null : d)}
                className={`relative flex flex-col items-center justify-start ${large ? "h-16 md:h-20 pt-2" : "h-12 pt-1.5"} rounded-2xl transition-colors ${
                  isSel ? "bg-[#1D1D1F]/[0.06]" : "hover:bg-black/[0.03]"
                }`}
              >
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] tabular-nums ${
                    isToday ? "bg-[#FF3B30] text-white font-bold" : dow === 0 ? "text-[#FF3B30]/80 font-medium" : dow === 6 ? "text-[#0A84FF]/80 font-medium" : "text-[#1D1D1F] font-medium"
                  }`}
                >
                  {d.getDate()}
                </span>
                {dayItems.length > 0 && (
                  large ? (
                    <div className="w-full px-1 mt-1 space-y-0.5 hidden md:block">
                      {dayItems.slice(0, 2).map((it) => (
                        <span key={it.key} className="block truncate text-[10px] font-semibold rounded px-1 text-left" style={{ color: it.color, backgroundColor: `${it.color}14` }}>{it.title}</span>
                      ))}
                      {dayItems.length > 2 && <span className="block text-[10px] text-[#8E8E93] text-left px-1">+{dayItems.length - 2}</span>}
                    </div>
                  ) : null
                )}
                {dayItems.length > 0 && (
                  <span className={`flex items-center gap-0.5 mt-1 ${large ? "md:hidden" : ""}`}>
                    {dayItems.slice(0, 3).map((it) => <span key={it.key} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: it.color }} />)}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// 달력 + 오른쪽 목록(선택한 날 일정 / 다가오는 일정) 묶음
export const ClubCalendar = ({
  events,
  isLoggedIn,
  onOpenEvent,
  large = false,
  upcomingCount = 5,
}: {
  events: any[];
  isLoggedIn: boolean;
  onOpenEvent?: (eventId: number) => void;
  large?: boolean;
  upcomingCount?: number;
}) => {
  const items = useClubSchedule(events, isLoggedIn);
  const [selected, setSelected] = useState<Date | null>(null);
  const today = startOfDay(new Date()).getTime();
  const upcoming = items.filter((it) => startOfDay(it.end).getTime() >= today).slice(0, upcomingCount);
  const dayList = selected ? itemsOnDay(items, selected) : [];

  return (
    <div className={`grid grid-cols-1 ${large ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"} gap-4 md:gap-5`}>
      <div className="glass-card rounded-[28px] p-5 md:p-6">
        <MonthCalendar items={items} selected={selected} onSelect={setSelected} large={large} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 pt-4 border-t border-black/[0.05]">
          {Object.entries(KIND_COLORS)
            .filter(([k]) => k !== "총회" || isLoggedIn)
            .map(([k, c]) => (
              <span key={k} className="flex items-center gap-1 text-[11px] text-[#6E6E73]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />{k === "총회" ? "총회 제출" : k}
              </span>
            ))}
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-5 md:p-6 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[17px] font-bold text-[#1D1D1F] tracking-[-0.02em]">{selected ? `${fmt(selected)} 일정` : "다가오는 일정"}</p>
          {selected && (
            <button onClick={() => setSelected(null)} className="text-[13px] font-semibold text-[#0071E3] hover:opacity-70">다가오는 일정 보기</button>
          )}
        </div>
        <div className="divide-y divide-black/[0.05] -mx-1">
          {(selected ? dayList : upcoming).map((it) => (
            <ScheduleRow key={it.key} item={it} onOpen={onOpenEvent} showDDay={!selected} />
          ))}
        </div>
        {(selected ? dayList : upcoming).length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#AEAEB2] py-10">
            {selected ? "이 날은 일정이 없어요." : "예정된 일정이 없어요."}
          </div>
        )}
        {!isLoggedIn && !selected && (
          <p className="mt-auto pt-3 text-[11px] text-[#AEAEB2]">로그인하면 총회 제출 시작·마감일도 함께 보여요.</p>
        )}
      </div>
    </div>
  );
};
