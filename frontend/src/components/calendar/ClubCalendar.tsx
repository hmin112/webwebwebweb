import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Lock, MapPin, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/axios";
import { DATE_MASK, DateMaskInput, isValidDate } from "../ui/DateMaskInput";

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
  // ✨ 관리자가 캘린더에 직접 넣은 일정(ClubSchedule)
  scheduleId?: number;
  memo?: string;
  membersOnly?: boolean;
  rawDate?: string;
  rawEndDate?: string;
  // ✨ 바깥 일정(조선대 학사일정·SW 지원 프로그램)은 원본 페이지 링크
  url?: string;
  // 기간이 길어 매일 점을 찍으면 달력이 복잡해지는 일정(SW 지원 프로그램 신청기간) — 달력에는 시작·마감일에만 점
  markEndsOnly?: boolean;
};

export const KIND_COLORS: Record<string, string> = {
  학술: "#0A84FF",
  친목: "#FF9F0A",
  대회: "#FF375F",
  기타: "#8E8E93",
  학사: "#AF52DE",
  SW사업단: "#30B0C7",
  총회: "#34C759",
};

// 관리자가 직접 넣는 일정/행사의 종류 (학사·SW사업단·총회는 자동으로 들어오는 것)
const EDITABLE_KINDS = ["학술", "친목", "대회", "기타"];

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

// 행사 + 관리자가 넣은 일정 + (로그인 시) 총회 제출 기간을 캘린더 항목으로
export const useClubSchedule = (events: any[], isLoggedIn: boolean) => {
  const [periods, setPeriods] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [externals, setExternals] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    api.get("/schedules/external").then((r) => { if (!cancelled) setExternals(r.data || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.get("/schedules").then((r) => { if (!cancelled) setSchedules(r.data || []); }).catch(() => { if (!cancelled) setSchedules([]); });
    return () => { cancelled = true; };
  }, [isLoggedIn, reloadKey]);
  useEffect(() => {
    if (!isLoggedIn) { setPeriods([]); return; }
    const year = new Date().getFullYear();
    let cancelled = false;
    Promise.all([year - 1, year, year + 1].map((y) => api.get(`/assembly/periods/${y}`).then((r) => r.data || []).catch(() => [])))
      .then((lists) => { if (!cancelled) setPeriods(lists.flat()); });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const items = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    externals.forEach((x: any) => {
      const s0 = x.startDate ? new Date(`${x.startDate}T00:00:00`) : null;
      if (!s0 || isNaN(s0.getTime())) return;
      const e0 = x.endDate ? new Date(`${x.endDate}T00:00:00`) : s0;
      const academic = x.source === "CHOSUN_ACADEMIC";
      const kind = academic ? "학사" : "SW사업단";
      items.push({
        key: `x${x.id}`, title: academic ? x.title : `${x.title} 신청`, start: s0, end: isNaN(e0.getTime()) || e0 < s0 ? s0 : e0,
        kind, color: KIND_COLORS[kind], url: x.url || undefined, markEndsOnly: !academic,
      });
    });
    schedules.forEach((sc: any) => {
      const s0 = parseEventDate(sc.date);
      if (!s0) return;
      const e0 = sc.endDate ? parseEventDate(sc.endDate) : null;
      const d = { start: s0.start, end: e0 && e0.start >= s0.start ? e0.start : s0.start };
      const kind = KIND_COLORS[sc.category] ? sc.category : "기타";
      items.push({
        key: `s${sc.id}`, title: sc.title, start: d.start, end: d.end, kind, color: KIND_COLORS[kind],
        location: sc.location || undefined, scheduleId: sc.id, memo: sc.memo || undefined, membersOnly: sc.membersOnly, rawDate: sc.date, rawEndDate: sc.endDate || "",
      });
    });
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
  }, [events, periods, schedules, externals]);
  return { items, reload: () => setReloadKey((k) => k + 1) };
};

const itemsOnDay = (items: CalendarItem[], day: Date) => {
  const t = startOfDay(day).getTime();
  return items.filter((it) => startOfDay(it.start).getTime() <= t && t <= startOfDay(it.end).getTime());
};

// 달력 칸에 점·제목으로 표시할 것 — 긴 신청기간은 시작일과 마감일에만
const markersOnDay = (items: CalendarItem[], day: Date) =>
  itemsOnDay(items, day).filter((it) => !it.markEndsOnly || sameDay(it.start, day) || sameDay(it.end, day));

export const dDay = (d: Date) => {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
  return diff === 0 ? "D-DAY" : diff > 0 ? `D-${diff}` : `D+${-diff}`;
};

const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
const fmtRange = (it: CalendarItem) => (sameDay(it.start, it.end) ? fmt(it.start) : `${fmt(it.start)} ~ ${fmt(it.end)}`);
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 한 줄 일정 — 색 막대 + 제목 + 날짜/장소 + D-day
export const ScheduleRow = ({ item, onOpen, onEdit, showDDay = true }: {
  item: CalendarItem; onOpen?: (eventId: number) => void; onEdit?: (item: CalendarItem) => void; showDDay?: boolean;
}) => {
  const openEvent = item.eventId != null && onOpen ? () => onOpen(item.eventId!) : null;
  const editSchedule = item.scheduleId != null && onEdit ? () => onEdit(item) : null;
  const openLink = item.url ? () => window.open(item.url, "_blank", "noopener,noreferrer") : null;
  const onClick = openEvent || editSchedule || openLink;
  const Inner = (
    <>
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: item.color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#1D1D1F] truncate tracking-[-0.01em] flex items-center gap-1">
          {item.membersOnly && <Lock size={12} className="text-[#8E8E93] shrink-0" aria-label="부원만 보기" />}
          <span className="truncate">{item.title}</span>
          {item.url && <ExternalLink size={11} className="text-[#AEAEB2] shrink-0" />}
        </p>
        <p className="text-xs text-[#8E8E93] mt-0.5 flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{fmtRange(item)}</span>
          <span className="shrink-0" style={{ color: item.color }}>· {item.kind}</span>
          {item.location && <span className="truncate flex items-center gap-0.5"><MapPin size={11} className="shrink-0" />{item.location}</span>}
        </p>
        {item.memo && <p className="text-xs text-[#6E6E73] mt-1 line-clamp-2 whitespace-pre-wrap">{item.memo}</p>}
      </div>
      {showDDay && (() => {
        // 이미 시작한 기간 일정은 "진행 중 · 10/16까지"로 (시작일 기준 D+로 보이지 않게)
        const now = startOfDay(new Date()).getTime();
        const ongoing = startOfDay(item.start).getTime() < now && now <= startOfDay(item.end).getTime();
        if (ongoing) {
          return (
            <span className="shrink-0 text-right leading-tight">
              <span className="block text-xs font-bold text-[#34C759]">진행 중</span>
              <span className="block text-[10px] text-[#8E8E93] tabular-nums">{item.end.getMonth() + 1}/{item.end.getDate()}까지</span>
            </span>
          );
        }
        const label = dDay(item.start);
        return <span className={`shrink-0 text-xs font-bold tabular-nums ${label === "D-DAY" ? "text-[#FF3B30]" : "text-[#6E6E73]"}`}>{label}</span>;
      })()}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="w-full text-left flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-black/[0.03] transition-colors">
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
            const dayItems = markersOnDay(items, d);
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

const toDateText = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

type ScheduleForm = { id?: number; title: string; date: string; endDate: string; category: string; location: string; memo: string; membersOnly: boolean };

const ScheduleEditor = ({ initial, onClose, onSaved }: { initial: ScheduleForm; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState<ScheduleForm>(initial);
  const [saving, setSaving] = useState(false);
  const editing = initial.id != null;

  const save = async () => {
    if (!form.title.trim()) return alert("일정 제목을 입력해주세요.");
    if (!isValidDate(form.date)) return alert("시작일을 2026.04.27처럼 숫자 8자리로 입력해주세요.");
    if (form.endDate && !isValidDate(form.endDate)) return alert("종료일을 2026.04.29처럼 숫자 8자리로 입력하거나 비워주세요.");
    if (form.endDate && form.endDate < form.date) return alert("종료일이 시작일보다 빠를 수 없어요.");
    setSaving(true);
    try {
      const body = { title: form.title, date: form.date, endDate: form.endDate || null, category: form.category, location: form.location, memo: form.memo, membersOnly: form.membersOnly };
      if (editing) await api.put(`/admin/schedules/${initial.id}`, body);
      else await api.post("/admin/schedules", body);
      onSaved();
    } catch (e: any) {
      alert(e.response?.data?.message || "일정을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || !window.confirm(`"${initial.title}" 일정을 삭제할까요?`)) return;
    setSaving(true);
    try {
      await api.delete(`/admin/schedules/${initial.id}`);
      onSaved();
    } catch (e: any) {
      alert(e.response?.data?.message || "일정을 삭제하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const dateInvalid =
    (form.date.length === DATE_MASK.length && !isValidDate(form.date)) ||
    (form.endDate.length === DATE_MASK.length && !isValidDate(form.endDate));
  const rangeInvalid = !dateInvalid && isValidDate(form.date) && isValidDate(form.endDate) && form.endDate < form.date;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="relative w-full max-w-md bg-[#fff] rounded-[28px] shadow-[0_20px_60px_rgb(0_0_0/0.18)] max-h-[90vh] overflow-y-auto"
      >
        <div className="write-page rounded-[28px] p-6 md:p-7">
          <div className="flex items-start justify-between gap-3 mb-5">
            <h3 className="text-xl font-bold text-[#1D1D1F] tracking-[-0.02em]">{editing ? "일정 수정" : "일정 추가"}</h3>
            <button onClick={onClose} aria-label="닫기" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center hover:bg-black/[0.08] shrink-0"><X size={16} /></button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {EDITABLE_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, category: k })}
                  className={`h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${form.category === k ? "text-white" : "bg-black/[0.05] text-[#3A3A3C] hover:bg-black/[0.08]"}`}
                  style={form.category === k ? { backgroundColor: KIND_COLORS[k] } : undefined}
                >
                  {k}
                </button>
              ))}
            </div>

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="일정 제목 (예: 정기 세미나)"
              className="w-full h-12 px-4 rounded-xl text-[15px] font-semibold outline-none"
              autoFocus
            />

            <div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <DateMaskInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
                <span className="text-[#AEAEB2] font-semibold">~</span>
                <DateMaskInput value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
              </div>
              <p className={`text-[11px] mt-1.5 ml-1 ${dateInvalid || rangeInvalid ? "text-[#FF3B30]" : "text-[#8E8E93]"}`}>
                {dateInvalid ? "없는 날짜예요." : rangeInvalid ? "종료일이 시작일보다 빨라요." : "숫자 8자리만 입력하면 돼요. 하루 일정이면 오른쪽(종료일)은 비워두세요."}
              </p>
            </div>

            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="장소 (선택)"
              className="w-full h-12 px-4 rounded-xl text-[15px] outline-none"
            />
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="메모 (선택) — 준비물, 링크 등"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-[15px] outline-none resize-none"
            />

            <label className="flex items-center justify-between gap-3 px-1 cursor-pointer select-none">
              <span>
                <span className="block text-[15px] text-[#1D1D1F]">부원만 보기</span>
                <span className="block text-xs text-[#8E8E93]">켜면 로그인한 부원에게만 보여요.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={form.membersOnly}
                onClick={() => setForm({ ...form, membersOnly: !form.membersOnly })}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${form.membersOnly ? "bg-[#34C759]" : "bg-black/[0.12]"}`}
              >
                <span className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-[#fff] shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-transform ${form.membersOnly ? "translate-x-[20px]" : ""}`} />
              </button>
            </label>
          </div>

          <div className="flex items-center gap-2 mt-6">
            {editing && (
              <button onClick={remove} disabled={saving} aria-label="삭제" className="h-11 w-11 rounded-full bg-[#FF3B30]/[0.08] text-[#FF3B30] flex items-center justify-center hover:bg-[#FF3B30]/[0.12] disabled:opacity-50 shrink-0">
                <Trash2 size={17} />
              </button>
            )}
            <button onClick={onClose} className="flex-1 h-11 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">취소</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors disabled:opacity-60">
              {saving ? "저장 중..." : editing ? "저장" : "추가"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// 달력 + 오른쪽 목록(선택한 날 일정 / 다가오는 일정) 묶음. 관리자는 일정을 바로 추가·수정·삭제할 수 있다.
export const ClubCalendar = ({
  events,
  isLoggedIn,
  isAdmin = false,
  onOpenEvent,
  large = false,
  upcomingCount = 5,
}: {
  events: any[];
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onOpenEvent?: (eventId: number) => void;
  large?: boolean;
  upcomingCount?: number;
}) => {
  const { items: allItems, reload } = useClubSchedule(events, isLoggedIn);
  // 범례를 눌러 종류별로 숨기기 — 학사일정처럼 많은 일정을 끄고 볼 수 있게 (이 브라우저에 기억)
  const [hiddenKinds, setHiddenKinds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("calendar.hiddenKinds") || "[]"); } catch { return []; }
  });
  const toggleKind = (k: string) =>
    setHiddenKinds((prev) => {
      const next = prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k];
      try { localStorage.setItem("calendar.hiddenKinds", JSON.stringify(next)); } catch { /* 저장 못 해도 동작은 그대로 */ }
      return next;
    });
  const items = allItems.filter((it) => !hiddenKinds.includes(it.kind));
  const [selected, setSelected] = useState<Date | null>(null);
  const [editor, setEditor] = useState<ScheduleForm | null>(null);
  const today = startOfDay(new Date()).getTime();
  const upcoming = items.filter((it) => startOfDay(it.end).getTime() >= today).slice(0, upcomingCount);
  const dayList = selected ? itemsOnDay(items, selected) : [];

  const openNew = () =>
    setEditor({ title: "", date: selected ? toDateText(selected) : "", endDate: "", category: "학술", location: "", memo: "", membersOnly: false });
  const openEdit = (it: CalendarItem) =>
    setEditor({ id: it.scheduleId, title: it.title, date: it.rawDate || toDateText(it.start), endDate: it.rawEndDate || "", category: it.kind, location: it.location || "", memo: it.memo || "", membersOnly: !!it.membersOnly });

  return (
    <div className={`grid grid-cols-1 ${large ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"} gap-4 md:gap-5`}>
      <div className="glass-card rounded-[28px] p-5 md:p-6">
        <MonthCalendar items={items} selected={selected} onSelect={setSelected} large={large} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 pt-4 border-t border-black/[0.05]">
          {Object.entries(KIND_COLORS)
            .filter(([k]) => k !== "총회" || isLoggedIn)
            .map(([k, c]) => {
              const off = hiddenKinds.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleKind(k)}
                  title={off ? "눌러서 다시 보기" : "눌러서 숨기기"}
                  className={`flex items-center gap-1 text-[11px] rounded-full px-1.5 py-0.5 -mx-0.5 transition-opacity hover:bg-black/[0.04] ${off ? "opacity-35 line-through" : "text-[#6E6E73]"}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />{k === "총회" ? "총회 제출" : k}
                </button>
              );
            })}
          <span className="text-[10px] text-[#C7C7CC] ml-auto">종류를 눌러 숨길 수 있어요</span>
        </div>
      </div>

      <div className="glass-card rounded-[28px] p-5 md:p-6 flex flex-col min-h-[280px]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[17px] font-bold text-[#1D1D1F] tracking-[-0.02em]">{selected ? `${fmt(selected)} 일정` : "다가오는 일정"}</p>
          <div className="flex items-center gap-1 shrink-0">
            {selected && (
              <button onClick={() => setSelected(null)} className="h-8 px-2.5 rounded-full text-[13px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.08]">전체</button>
            )}
            {isAdmin && (
              <button onClick={openNew} className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#0071E3] text-white text-[13px] font-semibold hover:bg-[#0077ED] transition-colors">
                <Plus size={14} /> {selected ? "이 날에 추가" : "일정 추가"}
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-black/[0.05] -mx-1">
          {(selected ? dayList : upcoming).map((it) => (
            <ScheduleRow key={it.key} item={it} onOpen={onOpenEvent} onEdit={isAdmin ? openEdit : undefined} showDDay={!selected} />
          ))}
        </div>
        {(selected ? dayList : upcoming).length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-[#AEAEB2] py-10">
            {selected ? "이 날은 일정이 없어요." : "예정된 일정이 없어요."}
          </div>
        )}
        {isAdmin && (
          <p className="mt-auto pt-3 text-[11px] text-[#AEAEB2]">관리자: 직접 추가한 일정을 누르면 고치거나 지울 수 있어요.</p>
        )}
        {!isLoggedIn && !selected && (
          <p className="mt-auto pt-3 text-[11px] text-[#AEAEB2]">로그인하면 총회 제출 시작·마감일과 부원 전용 일정도 함께 보여요.</p>
        )}
      </div>

      {/* 팝업은 본문(main) 바로 아래로 — 페이지 배경의 유리 효과(backdrop-filter) 안에 있으면 화면이 아니라
          페이지 기준으로 가운데를 잡아 엉뚱한 위치에 떴다 */}
      {createPortal(
        <AnimatePresence>
          {editor && (
            <ScheduleEditor
              key={editor.id ?? "new"}
              initial={editor}
              onClose={() => setEditor(null)}
              onSaved={() => { setEditor(null); reload(); }}
            />
          )}
        </AnimatePresence>,
        document.querySelector("main") ?? document.body
      )}
    </div>
  );
};
