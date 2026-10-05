import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Crown, Download, ExternalLink, FileText, GraduationCap,
  Image as ImageIcon, Loader2, MessageCircle, Package, Paperclip, PartyPopper, Plus, RefreshCw, Scissors, Search, Trash2,
  Trophy, UserPlus, Users, X,
} from "lucide-react";
import { api } from "../../../api/axios";
import { DateMaskInput, isValidDate } from "../../../components/ui/DateMaskInput";

// ✨ [2026-10-05 신규] 관리자 "실적" — 해마다 대회·총회·교육·행사를 그때그때 올려 둔다.
// 대회는 참가 팀/개인마다 상과 파일(상장·기획서·결과물·사진), 총회·교육은 출석 기록을 연결해 출석부가 같이 나간다.
// 명예의 전당 글은 그해를 열면 대회로 자동으로 들어온다(상·수상자·대표 사진). 들어온 뒤엔 여기서 고치고 파일을 더 붙인다.
// 오른쪽 위 "전체 다운로드"는 연도 폴더 → 구분 → 실적 → 사람/팀 → 파일 칸 순서의 압축 파일.

type Cat = "CERTIFICATE" | "PLAN" | "RESULT" | "PHOTO" | "ETC";
type TypeId = "COMPETITION" | "ASSEMBLY" | "EDUCATION" | "EVENT";
type FileItem = { id: number; entryId: number | null; category: Cat; name: string; size: number; contentType: string | null; image: boolean; hasThumb: boolean; uploadedAt: string };
type MemberRef = { loginId: string | null; name: string | null; studentId: string | null };
type Entry = { id: number; name: string | null; award: string | null; members: MemberRef[]; files: FileItem[] };
type Attendance = { sessionId: number; title: string; startedAt: string; checked: number; total: number; attendees: string[] };
type Achievement = {
  id: number; year: number; type: TypeId; title: string; startDate: string | null; endDate: string | null;
  organizer: string | null; memo: string | null; hallOfFameId: number | null; hallOfFameLinked: boolean;
  attendance: Attendance | null; entries: Entry[]; files: FileItem[];
  participants: MemberRef[]; sourceUrl: string | null; fromDiscord: boolean; updatedAt: string;
};
type ImportResult = { year: number; created: string[]; skipped: string[]; upcoming: string[]; notes: string[] };
type SessionOpt = { id: number; title: string; startedAt: string; checked: number; total: number; linkedAchievementId: number | null };
type MemberLite = { loginId: string; name: string; studentId: string; profileImage?: string | null };

const TYPES: { id: TypeId; label: string; icon: typeof Trophy; color: string }[] = [
  { id: "COMPETITION", label: "대회", icon: Trophy, color: "#FF9F0A" },
  { id: "ASSEMBLY", label: "총회", icon: Users, color: "#0A84FF" },
  { id: "EDUCATION", label: "교육", icon: GraduationCap, color: "#30B0C7" },
  { id: "EVENT", label: "행사", icon: PartyPopper, color: "#AF52DE" },
];
const typeOf = (id: TypeId) => TYPES.find((t) => t.id === id) || TYPES[0];

const CATS: Record<Cat, { label: string; icon: typeof Award }> = {
  CERTIFICATE: { label: "상장", icon: Award },
  PLAN: { label: "기획서", icon: FileText },
  RESULT: { label: "결과물", icon: Package },
  PHOTO: { label: "사진", icon: ImageIcon },
  ETC: { label: "기타 자료", icon: Paperclip },
};
const RECORD_SLOTS: Record<TypeId, Cat[]> = {
  COMPETITION: ["PHOTO", "PLAN", "RESULT", "ETC"],
  ASSEMBLY: ["PHOTO", "RESULT", "ETC"],
  EDUCATION: ["PHOTO", "RESULT", "ETC"],
  EVENT: ["PHOTO", "RESULT", "ETC"],
};
const ENTRY_SLOTS: Cat[] = ["CERTIFICATE", "PLAN", "RESULT", "PHOTO"];
const AWARDS = ["대상", "최우수상", "우수상", "장려상", "입선", "특별상", "본선 진출", "참가"];

const shortId = (sid?: string | null) => (sid && sid.trim().length >= 4 ? sid.trim().substring(2, 4) : "");
const memberLabel = (m: MemberRef) => `${shortId(m.studentId) ? shortId(m.studentId) + " " : ""}${m.name || m.loginId || "?"}`;
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const todayDot = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};
const dateText = (a: Achievement) => (a.startDate ? `${a.startDate}${a.endDate ? ` ~ ${a.endDate.slice(5)}` : ""}` : "날짜 미정");
const allFiles = (a: Achievement) => [...a.files, ...a.entries.flatMap((e) => e.files)];
const errMsg = (e: any, fallback: string) => e?.response?.data?.message || fallback;

// ---------- 내려받기 · 미리보기 ----------

const download = async (kind: "YEAR" | "RECORD" | "FILE", opts: { year?: number; id?: number }) => {
  try {
    const res = await api.post("/admin/achievements/download-token", { kind, ...opts });
    const a = document.createElement("a");
    a.href = res.data.url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert(errMsg(e, "내려받지 못했어요."));
  }
};

const thumbCache = new Map<number, Promise<string | null>>();
const loadThumb = (id: number) => {
  if (!thumbCache.has(id)) {
    thumbCache.set(id, api.get(`/admin/achievements/files/${id}/thumb`, { responseType: "blob" })
      .then((r) => URL.createObjectURL(r.data)).catch(() => null));
  }
  return thumbCache.get(id)!;
};

const Thumb = ({ file, className = "" }: { file: FileItem; className?: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!file.image) { setFailed(true); return; }
    loadThumb(file.id).then((u) => { if (alive) { if (u) setUrl(u); else setFailed(true); } });
    return () => { alive = false; };
  }, [file.id, file.image]);
  if (url) return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />;
  return (
    <span className={`flex items-center justify-center bg-black/[0.04] text-[#AEAEB2] ${className}`}>
      {failed ? <ImageIcon size={18} /> : <Loader2 size={14} className="animate-spin" />}
    </span>
  );
};

// 사진은 브라우저에서 작은 미리보기를 만들어 같이 올린다 (휴대폰 사진 방향도 맞춰서)
const makeThumb = async (file: File): Promise<Blob | null> => {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const w = Math.min(640, bmp.width);
    const h = Math.max(1, Math.round(bmp.height * (w / bmp.width)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82));
  } catch {
    return null;
  }
};

// ---------- 탭 ----------

export const AchievementsTab = () => {
  const [years, setYears] = useState<{ year: number; count: number }[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [list, setList] = useState<Achievement[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<TypeId | "ALL">("ALL");
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<MemberLite[]>([]);

  const loadYears = () => api.get("/admin/achievements/years").then((r) => setYears(r.data || [])).catch(() => {});
  const load = (y = year) => {
    setState((s) => (s === "ready" ? s : "loading"));
    return api.get("/admin/achievements", { params: { year: y } })
      .then((r) => { setList(r.data || []); setState("ready"); })
      .catch(() => setState("error"));
  };

  useEffect(() => {
    loadYears();
    api.get("/admin/members")
      .then((r) => setMembers((r.data || []).filter((m: any) => !m.deletedAt).map((m: any) => ({
        loginId: m.loginId, name: m.name, studentId: m.studentId, profileImage: m.profileImage,
      }))))
      .catch(() => {});
  }, []);
  useEffect(() => { setState("loading"); load(year); }, [year]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: list.length };
    for (const t of TYPES) c[t.id] = list.filter((a) => a.type === t.id).length;
    return c;
  }, [list]);

  const groups = useMemo(() => TYPES
    .filter((t) => filter === "ALL" || filter === t.id)
    .map((t) => ({
      type: t,
      items: list.filter((a) => a.type === t.id).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || "") || b.id - a.id),
    }))
    .filter((g) => g.items.length > 0), [list, filter]);

  const open = list.find((a) => a.id === openId) || null;
  const [importing, setImporting] = useState(false);

  // 디스코드 동아리공지에서 그해 총회를 한 번에 — 이미 있는 달은 그대로 두고 없는 달만 새로 만든다
  const importDiscord = async (): Promise<ImportResult | null> => {
    setImporting(true);
    try {
      const res = await api.post("/admin/achievements/import-discord", null, { params: { year } });
      await load(year);
      loadYears();
      return res.data;
    } catch (e) {
      alert(errMsg(e, "디스코드에서 가져오지 못했어요."));
      return null;
    } finally {
      setImporting(false);
    }
  };
  const replace = (a: Achievement) => setList((prev) => prev.some((x) => x.id === a.id) ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a]);
  // 여러 칸에 동시에 올려도 서로 덮어쓰지 않게 — 지금 목록의 최신 값에 바꿔 넣는다
  const patch = (id: number, fn: (a: Achievement) => Achievement) => setList((prev) => prev.map((x) => (x.id === id ? fn(x) : x)));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {/* 상 이름 자동 완성 */}
      <datalist id="ach-awards">{AWARDS.map((w) => <option key={w} value={w} />)}</datalist>

      {/* 머리 — 연도 · 새 실적 · 전체 다운로드 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <YearPicker years={years} year={year} onChange={setYear} />
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => download("YEAR", { year })}
            className="glass-card inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-[#1D1D1F] hover:text-[#0071E3] transition-colors"
          >
            <Download size={15} /> {year} 전체 다운로드
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shadow-[0_4px_14px_rgb(0_113_227/0.3)]"
          >
            <Plus size={16} /> 새 실적
          </button>
        </div>
      </div>

      {/* 구분 거르기 */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {([{ id: "ALL", label: "전체" }, ...TYPES] as { id: TypeId | "ALL"; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${filter === t.id ? "bg-[#1D1D1F] text-white" : "bg-black/[0.05] text-[#1D1D1F]/70 hover:bg-black/[0.08]"}`}
          >
            {t.label} <span className={`ml-0.5 tabular-nums ${filter === t.id ? "text-white/60" : "text-[#8E8E93]"}`}>{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {state === "loading" ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#0071E3]" /></div>
      ) : state === "error" ? (
        <p className="text-center text-sm text-[#8E8E93] py-24">실적을 불러오지 못했어요.</p>
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-[28px] py-20 px-6 text-center">
          <Trophy size={32} className="mx-auto text-[#C7C7CC] mb-3" />
          <p className="text-[15px] font-semibold text-[#1D1D1F]">{year}년 실적이 아직 없어요</p>
          <p className="text-sm text-[#8E8E93] mt-1">대회·총회·교육이 끝나면 바로 올려두세요. 명예의 전당 글은 자동으로 들어와요.</p>
          <button onClick={() => setCreating(true)} className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#0071E3] text-white text-sm font-semibold"><Plus size={16} /> 새 실적</button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ type, items }) => (
            <section key={type.id}>
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#1D1D1F] mb-3 px-1">
                <type.icon size={16} style={{ color: type.color }} /> {type.label}
                <span className="text-[#8E8E93] font-semibold tabular-nums">{items.length}</span>
                {type.id === "ASSEMBLY" && (
                  <DiscordImportButton year={year} importing={importing} onImport={importDiscord} small />
                )}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {items.map((a) => <AchievementCard key={a.id} a={a} onOpen={() => setOpenId(a.id)} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {creating && (
            <NewAchievementSheet
              key="new"
              defaultYear={year}
              onClose={() => setCreating(false)}
              onImport={importDiscord}
              importing={importing}
              onCreated={(a) => {
                setCreating(false);
                loadYears();
                if (a.year !== year) { setYear(a.year); setOpenId(a.id); return; }
                replace(a);
                setOpenId(a.id);
              }}
            />
          )}
          {open && (
            <AchievementDetail
              key={`d${open.id}`}
              a={open}
              members={members}
              onChange={replace}
              onPatch={(fn) => patch(open.id, fn)}
              onClose={() => setOpenId(null)}
              onDeleted={() => { setList((p) => p.filter((x) => x.id !== open.id)); setOpenId(null); loadYears(); }}
              onYearChanged={(y) => { setOpenId(null); loadYears(); setYear(y); }}
            />
          )}
        </AnimatePresence>,
        document.querySelector("main") ?? document.body
      )}
    </motion.div>
  );
};

// ---------- 카드 ----------

const AchievementCard = ({ a, onOpen }: { a: Achievement; onOpen: () => void }) => {
  const t = typeOf(a.type);
  const files = allFiles(a);
  const photos = files.filter((f) => f.category === "PHOTO" && f.image).slice(0, 4);
  const awards = a.entries.filter((e) => e.award).map((e) => e.award!);
  return (
    <motion.button
      layout
      onClick={onOpen}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className="glass-card rounded-[24px] p-4 md:p-5 text-left flex flex-col gap-3 min-h-[148px]"
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.color}1A`, color: t.color }}>
          <t.icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-[#1D1D1F] leading-snug line-clamp-2">{a.title}</p>
          <p className="text-[12px] text-[#8E8E93] mt-0.5 tabular-nums">{dateText(a)}</p>
        </div>
        {a.hallOfFameId && <Crown size={15} className="text-[#C9A227] shrink-0 mt-1" aria-label="명예의 전당" />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {a.type === "COMPETITION" ? (
          <>
            <Chip>{a.entries.length ? `참가 ${a.entries.length}` : "참가 미입력"}</Chip>
            {[...new Set(awards)].slice(0, 3).map((w) => <Chip key={w} tone="gold">{w}</Chip>)}
          </>
        ) : (
          <>
            {a.participants.length > 0 && <Chip tone="blue">참석 {a.participants.length}명</Chip>}
            {a.attendance && <Chip tone="blue">QR 출석 {a.attendance.checked}/{a.attendance.total}</Chip>}
            {!a.participants.length && !a.attendance && <Chip>참석 인원 없음</Chip>}
            {a.fromDiscord && <Chip tone="discord">디스코드</Chip>}
          </>
        )}
        <Chip>파일 {files.length}</Chip>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 mt-auto">
          {photos.map((p) => <Thumb key={p.id} file={p} className="w-full aspect-square rounded-[10px]" />)}
        </div>
      )}
    </motion.button>
  );
};

const Chip = ({ children, tone }: { children: ReactNode; tone?: "gold" | "blue" | "discord" }) => (
  <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold ${
    tone === "gold" ? "bg-[#FF9F0A]/[0.12] text-[#B25000]"
      : tone === "blue" ? "bg-[#0A84FF]/[0.10] text-[#0062CC]"
      : tone === "discord" ? "bg-[#5865F2]/[0.10] text-[#4752C4]"
      : "bg-black/[0.05] text-[#6E6E73]"
  }`}>{children}</span>
);

// ---------- 연도 고르기 ----------
// 해가 늘어나도 한 칸 — 좌우 화살표로 넘기고, 가운데를 누르면 전체 연도 목록

const YearPicker = ({ years, year, onChange }: { years: { year: number; count: number }[]; year: number; onChange: (y: number) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => {
    const list = [...years];
    if (!list.some((y) => y.year === year)) list.push({ year, count: 0 });
    return list.sort((a, b) => b.year - a.year);
  }, [years, year]);
  const idx = sorted.findIndex((y) => y.year === year);
  const older = sorted[idx + 1];
  const newer = idx > 0 ? sorted[idx - 1] : undefined;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative self-start">
      <div className="glass-card inline-flex items-center gap-0.5 h-11 p-1 rounded-full">
        <button aria-label="이전 해" disabled={!older} onClick={() => older && onChange(older.year)} className="w-9 h-9 rounded-full flex items-center justify-center text-[#1D1D1F]/60 hover:bg-black/[0.05] disabled:opacity-25"><ChevronLeft size={18} /></button>
        <button onClick={() => setOpen((v) => !v)} className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 hover:bg-black/[0.04]">
          <span className="text-[17px] font-bold text-[#1D1D1F] tabular-nums tracking-[-0.01em]">{year}년</span>
          <ChevronDown size={15} className={`text-[#8E8E93] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <button aria-label="다음 해" disabled={!newer} onClick={() => newer && onChange(newer.year)} className="w-9 h-9 rounded-full flex items-center justify-center text-[#1D1D1F]/60 hover:bg-black/[0.05] disabled:opacity-25"><ChevronRight size={18} /></button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-48 max-h-[320px] overflow-y-auto rounded-2xl bg-[#fff]/95 backdrop-blur-xl p-1.5 shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_12px_32px_rgb(0_0_0/0.14)]"
          >
            {sorted.map((y) => (
              <button
                key={y.year}
                onClick={() => { onChange(y.year); setOpen(false); }}
                className={`w-full flex items-center gap-2 h-10 px-3 rounded-xl text-left transition-colors ${y.year === year ? "bg-[#0071E3]/[0.08]" : "hover:bg-black/[0.04]"}`}
              >
                <span className={`text-[15px] font-semibold tabular-nums ${y.year === year ? "text-[#0071E3]" : "text-[#1D1D1F]"}`}>{y.year}년</span>
                <span className="text-[12px] text-[#8E8E93] tabular-nums">{y.count ? `${y.count}건` : ""}</span>
                {y.year === year && <Check size={15} className="ml-auto text-[#0071E3]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- 디스코드에서 총회 가져오기 ----------

const DiscordImportButton = ({ year, importing, onImport, small }: {
  year: number; importing: boolean; onImport: () => Promise<ImportResult | null>; small?: boolean;
}) => {
  const run = async () => {
    if (!confirm(`디스코드 동아리공지에서 ${year}년 총회 공지를 찾아 가져올까요?\n이미 있는 달은 그대로 두고 없는 달만 새로 만들어요.`)) return;
    const r = await onImport();
    if (r) alert(importSummary(r));
  };
  return (
    <button
      onClick={run}
      disabled={importing}
      className={`${small ? "ml-auto h-8 px-3 text-[12px]" : "w-full h-12 text-[15px]"} rounded-full bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-70`}
    >
      {importing ? <Loader2 size={small ? 13 : 16} className="animate-spin" /> : <MessageCircle size={small ? 13 : 16} />}
      {importing ? "디스코드 공지 읽는 중…" : small ? "디스코드에서 가져오기" : `디스코드에서 ${year}년 총회 가져오기`}
    </button>
  );
};

const importSummary = (r: ImportResult) => {
  const lines = [`${r.year}년 총회 가져오기`];
  lines.push(r.created.length ? `\n새로 가져옴 (${r.created.length})\n· ${r.created.join("\n· ")}` : "\n새로 가져온 총회가 없어요.");
  if (r.skipped.length) lines.push(`\n이미 있어서 그대로 둠: ${r.skipped.join(", ")}`);
  if (r.upcoming.length) lines.push(`\n아직 안 열려서 다음에: ${r.upcoming.join(", ")}`);
  if (r.notes.length) lines.push(`\n${r.notes.join("\n")}`);
  return lines.join("\n");
};

// ---------- 새 실적 ----------

const NewAchievementSheet = ({ defaultYear, onClose, onCreated, onImport, importing }: {
  defaultYear: number; onClose: () => void; onCreated: (a: Achievement) => void;
  onImport: () => Promise<ImportResult | null>; importing: boolean;
}) => {
  const [type, setType] = useState<TypeId>("COMPETITION");
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [start, setStart] = useState(defaultYear === new Date().getFullYear() ? todayDot() : "");
  const [end, setEnd] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [saving, setSaving] = useState(false);

  // 총회는 이름을 "N월 정기총회"로 미리 채워 둔다
  useEffect(() => {
    if (touched) return;
    const m = start.match(/^\d{4}\.(\d{2})/);
    setTitle(type === "ASSEMBLY" ? `${m ? Number(m[1]) : new Date().getMonth() + 1}월 정기총회` : "");
  }, [type, start, touched]);

  const submit = async () => {
    if (!title.trim()) return alert("이름을 입력해주세요.");
    if (start && !isValidDate(start)) return alert("날짜를 확인해주세요.");
    if (end && !isValidDate(end)) return alert("끝나는 날을 확인해주세요.");
    setSaving(true);
    try {
      const res = await api.post("/admin/achievements", {
        year: defaultYear, type, title, startDate: start || null, endDate: end || null,
        organizer: type === "COMPETITION" ? organizer : null,
      });
      onCreated(res.data);
    } catch (e) {
      alert(errMsg(e, "만들지 못했어요."));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} width="max-w-md">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-xl font-bold text-[#1D1D1F] tracking-[-0.02em]">새 실적</h3>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">만들고 나면 바로 사람과 파일을 넣을 수 있어요.</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-black/[0.05] mb-4">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[12px] font-semibold transition-all ${type === t.id ? "bg-[#fff] shadow-[0_1px_3px_rgb(0_0_0/0.12)] text-[#1D1D1F]" : "text-[#6E6E73]"}`}
          >
            <t.icon size={17} style={{ color: type === t.id ? t.color : undefined }} />
            {t.label}
          </button>
        ))}
      </div>

      <Field label="이름">
        <input
          autoFocus
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTouched(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={type === "COMPETITION" ? "예: 2026 SW 해커톤" : type === "EDUCATION" ? "예: C언어 기초 교육 3주차" : type === "EVENT" ? "예: MT" : ""}
          className="w-full h-12 px-4 rounded-xl text-[15px] font-semibold outline-none"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="날짜"><DateMaskInput value={start} onChange={setStart} /></Field>
        <Field label="끝나는 날 (여러 날이면)"><DateMaskInput value={end} onChange={setEnd} /></Field>
      </div>
      {type === "COMPETITION" && (
        <Field label="주최 (선택)">
          <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} placeholder="예: 과학기술정보통신부" className="w-full h-12 px-4 rounded-xl text-[15px] outline-none" />
        </Field>
      )}
      {type === "ASSEMBLY" && (
        <div className="rounded-2xl bg-[#5865F2]/[0.06] p-4 mb-4">
          <p className="text-[14px] font-semibold text-[#1D1D1F]">디스코드에서 한 번에 가져오기</p>
          <p className="text-[12px] text-[#6E6E73] mt-1 mb-3 leading-relaxed">
            동아리공지 채널의 {defaultYear}년 총회 공지를 달마다 찾아 날짜·공지 내용·참석 반응한 사람까지 넣어요.
            이미 있는 달은 그대로 두고 없는 달만 새로 만들어요.
          </p>
          <DiscordImportButton year={defaultYear} importing={importing} onImport={async () => { const r = await onImport(); if (r) onClose(); return r; }} />
          <p className="text-[11px] text-[#8E8E93] mt-3 text-center">또는 아래에서 한 달만 직접 만들기</p>
        </div>
      )}
      {type !== "COMPETITION" && (
        <p className="text-xs text-[#8E8E93] -mt-1 mb-4 px-1">같은 달 QR 출석 기록이 있으면 자동으로 연결돼요.</p>
      )}

      <button
        onClick={submit}
        disabled={saving}
        className="w-full h-12 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] disabled:opacity-60 inline-flex items-center justify-center gap-1.5 mt-2"
      >
        {saving && <Loader2 size={16} className="animate-spin" />} 만들기
      </button>
    </Modal>
  );
};

// ---------- 상세 ----------
// 데스크탑: 화면에 꽉 차는 넓은 창 — 왼쪽은 정보, 오른쪽은 참가/참석·파일. 칸마다 따로 스크롤되고 창 자체는 움직이지 않는다.
// 휴대폰: 한 줄로 쌓이고 창 안에서만 스크롤.

const AchievementDetail = ({ a, members, onChange, onPatch, onClose, onDeleted, onYearChanged }: {
  a: Achievement; members: MemberLite[]; onChange: (a: Achievement) => void;
  onPatch: (fn: (a: Achievement) => Achievement) => void; onClose: () => void;
  onDeleted: () => void; onYearChanged: (year: number) => void;
}) => {
  const t = typeOf(a.type);
  const [form, setForm] = useState(() => ({
    title: a.title, startDate: a.startDate || "", endDate: a.endDate || "", organizer: a.organizer || "", memo: a.memo || "",
  }));
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionOpt[] | null>(null);
  const [picker, setPicker] = useState<null | "INDIVIDUAL" | "TEAM" | "PARTICIPANTS">(null);
  const [lightbox, setLightbox] = useState<{ files: FileItem[]; index: number } | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const competition = a.type === "COMPETITION";

  useEffect(() => {
    if (competition) return;
    api.get("/admin/achievements/sessions", { params: { year: a.year } }).then((r) => setSessions(r.data || [])).catch(() => setSessions([]));
  }, [competition, a.year]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !picker && !lightbox) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const save = async (patch: Partial<{ type: TypeId; attendanceSessionId: number | null }> = {}) => {
    if (form.startDate && !isValidDate(form.startDate)) return alert("날짜를 확인해주세요.");
    if (form.endDate && !isValidDate(form.endDate)) return alert("끝나는 날을 확인해주세요.");
    setSaving(true);
    try {
      const res = await api.put(`/admin/achievements/${a.id}`, {
        year: a.year,
        type: patch.type ?? a.type,
        title: form.title,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        organizer: form.organizer,
        memo: form.memo,
        attendanceSessionId: "attendanceSessionId" in patch ? patch.attendanceSessionId : a.attendance?.sessionId ?? null,
      });
      const next: Achievement = res.data;
      if (next.year !== a.year) onYearChanged(next.year);
      else onChange(next);
    } catch (e) {
      alert(errMsg(e, "저장하지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  // 입력칸에서 벗어날 때 바뀐 게 있으면 저장
  const dirty = form.title !== a.title || form.startDate !== (a.startDate || "") || form.endDate !== (a.endDate || "")
    || form.organizer !== (a.organizer || "") || form.memo !== (a.memo || "");
  const saveIfDirty = () => { if (dirty && form.title.trim()) save(); };
  const close = () => { saveIfDirty(); onClose(); };

  const remove = async () => {
    const n = allFiles(a).length;
    if (!confirm(`"${a.title}" 실적을 지울까요?${n ? `\n올린 파일 ${n}개도 함께 지워져요.` : ""}`)) return;
    try {
      await api.delete(`/admin/achievements/${a.id}`);
      onDeleted();
    } catch (e) {
      alert(errMsg(e, "지우지 못했어요."));
    }
  };

  // 파일 올리기 — 칸마다 진행 개수를 보여주고, 3개씩 동시에
  const upload = async (list: File[], category: Cat, entryId: number | null) => {
    if (!list.length) return;
    const key = `${entryId ?? "r"}:${category}`;
    setPending((p) => ({ ...p, [key]: (p[key] || 0) + list.length }));
    const queue = [...list];
    const failed: string[] = [];
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift()!;
        try {
          const body = new FormData();
          body.append("file", file);
          body.append("category", category);
          if (entryId != null) body.append("entryId", String(entryId));
          const thumb = await makeThumb(file);
          if (thumb) body.append("thumb", thumb, "thumb.jpg");
          const res = await api.post(`/admin/achievements/${a.id}/files`, body);
          const f: FileItem = res.data;
          onPatch((cur) => entryId == null
            ? { ...cur, files: [...cur.files, f] }
            : { ...cur, entries: cur.entries.map((e) => (e.id === entryId ? { ...e, files: [...e.files, f] } : e)) });
        } catch (e) {
          failed.push(`${file.name} — ${errMsg(e, "실패")}`);
        } finally {
          setPending((p) => ({ ...p, [key]: Math.max(0, (p[key] || 1) - 1) }));
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (failed.length) alert(`올리지 못한 파일이 있어요.\n${failed.join("\n")}`);
  };

  const removeFile = async (f: FileItem) => {
    if (!confirm(`"${f.name}" 파일을 지울까요?`)) return false;
    try {
      await api.delete(`/admin/achievements/files/${f.id}`);
      onPatch((cur) => ({
        ...cur,
        files: cur.files.filter((x) => x.id !== f.id),
        entries: cur.entries.map((e) => ({ ...e, files: e.files.filter((x) => x.id !== f.id) })),
      }));
      return true;
    } catch (e) {
      alert(errMsg(e, "지우지 못했어요."));
      return false;
    }
  };

  const call = async (fn: () => Promise<{ data: Achievement }>) => {
    try {
      onChange((await fn()).data);
    } catch (e) {
      alert(errMsg(e, "저장하지 못했어요."));
    }
  };

  const setParticipants = (list: MemberRef[]) => call(() => api.put(`/admin/achievements/${a.id}/participants`, { members: list }));

  const resyncDiscord = async () => {
    if (!confirm("디스코드 공지의 반응을 다시 읽어 참석 인원을 새로 맞출까요?\n직접 고친 참석 인원은 디스코드 기준으로 바뀌어요.")) return;
    setSyncing(true);
    await call(() => api.post(`/admin/achievements/${a.id}/resync-discord`));
    setSyncing(false);
  };

  const pick = async (picked: MemberRef[]) => {
    const mode = picker;
    setPicker(null);
    if (!picked.length) return;
    if (mode === "PARTICIPANTS") return setParticipants([...a.participants, ...picked]);
    if (mode === "TEAM") return call(() => api.post(`/admin/achievements/${a.id}/entries`, { name: null, award: null, members: picked }));
    let last: Achievement | null = null;
    for (const m of picked) {
      try {
        last = (await api.post(`/admin/achievements/${a.id}/entries`, { name: null, award: null, members: [m] })).data;
      } catch (e) {
        alert(errMsg(e, "추가하지 못했어요."));
        break;
      }
    }
    if (last) onChange(last);
  };

  const recordSlots = (
    <div className="space-y-2.5">
      {RECORD_SLOTS[a.type].map((cat) => (
        <FileSlot
          key={cat}
          category={cat}
          files={a.files.filter((f) => f.category === cat)}
          pending={pending[`r:${cat}`] || 0}
          onUpload={(files) => upload(files, cat, null)}
          onOpen={(files, index) => setLightbox({ files, index })}
          onRemove={removeFile}
        />
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center px-2 md:px-6 pt-[72px] md:pt-[84px] pb-2 md:pb-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={close} />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="relative w-full max-w-[1280px] h-full bg-[#fff] rounded-[24px] md:rounded-[28px] shadow-[0_24px_70px_rgb(0_0_0/0.22)] overflow-hidden"
      >
        <div className="write-page h-full flex flex-col">
          {/* 머리 */}
          <div className="shrink-0 px-4 md:px-7 pt-4 md:pt-5 pb-3 border-b border-black/[0.06]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ backgroundColor: `${t.color}1A`, color: t.color }}>
                <t.icon size={17} />
              </span>
              <select
                value={a.type}
                onChange={(e) => save({ type: e.target.value as TypeId })}
                className="h-8 pl-2.5 pr-7 rounded-full text-[12px] font-bold outline-none"
                aria-label="구분"
              >
                {TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
              {a.hallOfFameId && (
                <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#C9A227]/[0.12] text-[#8A6D0B] text-[11px] font-bold">
                  <Crown size={12} /> 명예의 전당{a.hallOfFameLinked ? "" : " (원글 삭제됨)"}
                </span>
              )}
              {a.sourceUrl && (
                <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#5865F2]/[0.1] text-[#4752C4] text-[11px] font-bold hover:bg-[#5865F2]/[0.16]">
                  <MessageCircle size={12} /> 디스코드 공지 <ExternalLink size={11} />
                </a>
              )}
              {saving && <Loader2 size={14} className="animate-spin text-[#8E8E93]" />}
              <div className="ml-auto flex items-center gap-1.5">
                <IconButton label="이 실적 압축 다운로드" onClick={() => download("RECORD", { id: a.id })}><Download size={16} /></IconButton>
                <IconButton label="실적 삭제" danger onClick={remove}><Trash2 size={16} /></IconButton>
                <CloseButton onClick={close} />
              </div>
            </div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={saveIfDirty}
              className="bare-field w-full mt-1.5 text-[21px] md:text-[26px] font-bold tracking-[-0.02em] text-[#1D1D1F] outline-none"
              placeholder="이름"
            />
          </div>

          {/* 본문 — 데스크탑은 두 칸이 각각 스크롤 */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain lg:overflow-hidden lg:grid lg:grid-cols-[360px_minmax(0,1fr)]">
            {/* 왼쪽: 정보 */}
            <div className="p-4 md:p-6 space-y-5 lg:overflow-y-auto lg:overscroll-contain lg:border-r border-black/[0.06] lg:bg-[#FAFAFC]">
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="날짜"><div onBlur={saveIfDirty}><DateMaskInput value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} /></div></Field>
                  <Field label="끝나는 날"><div onBlur={saveIfDirty}><DateMaskInput value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} /></div></Field>
                </div>
                {competition && (
                  <Field label="주최">
                    <input value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} onBlur={saveIfDirty} placeholder="예: 과학기술정보통신부" className="w-full h-12 px-4 rounded-xl text-[15px] outline-none" />
                  </Field>
                )}
                <Field label="메모">
                  <textarea
                    value={form.memo}
                    onChange={(e) => setForm({ ...form, memo: e.target.value })}
                    onBlur={saveIfDirty}
                    rows={competition ? 4 : 5}
                    placeholder="내용, 특이사항 (압축 파일의 정보.txt에 같이 들어가요)"
                    className="w-full px-4 py-3 rounded-xl text-[14px] leading-relaxed outline-none resize-y min-h-[90px]"
                  />
                </Field>
                {a.hallOfFameId && a.hallOfFameLinked && (
                  <button onClick={() => call(() => api.post(`/admin/achievements/${a.id}/resync-hof`))} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8A6D0B] hover:underline">
                    <RefreshCw size={12} /> 명예의 전당의 상·수상자 다시 가져오기
                  </button>
                )}
              </div>

              {competition ? (
                <Section title="대회 공통 자료" icon={Paperclip}>{recordSlots}</Section>
              ) : (
                <Section title="출석 기록 (QR 출석)" icon={CalendarDays}>
                  <select
                    value={a.attendance?.sessionId ?? ""}
                    onChange={(e) => save({ attendanceSessionId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full h-11 px-3 rounded-xl text-[14px] font-semibold outline-none"
                  >
                    <option value="">{sessions === null ? "불러오는 중…" : sessions.length ? "연결 안 함" : "올해 출석 기록 없음"}</option>
                    {(sessions || []).map((s) => (
                      <option key={s.id} value={s.id} disabled={s.linkedAchievementId != null && s.linkedAchievementId !== a.id}>
                        {s.startedAt.slice(5, 10).replace("-", ".")} · {s.title || "출석"} ({s.checked}/{s.total})
                        {s.linkedAchievementId != null && s.linkedAchievementId !== a.id ? " · 다른 실적에 연결됨" : ""}
                      </option>
                    ))}
                  </select>
                  {a.attendance && (
                    <div className="mt-2.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[20px] font-bold text-[#1D1D1F] tabular-nums">{a.attendance.checked}</span>
                        <span className="text-[12px] text-[#8E8E93]">/ {a.attendance.total}명 출석 · 출석부.xlsx로 같이 나가요</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden mt-1.5">
                        <div className="h-full rounded-full bg-[#34C759]" style={{ width: `${a.attendance.total ? (a.attendance.checked / a.attendance.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  )}
                </Section>
              )}
            </div>

            {/* 오른쪽 */}
            <div className="p-4 md:p-6 space-y-6 lg:overflow-y-auto lg:overscroll-contain border-t lg:border-t-0 border-black/[0.06]">
              {competition ? (
                <Section
                  title={`참가 ${a.entries.length || ""}`}
                  icon={Users}
                  right={
                    <div className="flex gap-1.5">
                      <button onClick={() => setPicker("INDIVIDUAL")} className="h-8 px-3 rounded-full bg-black/[0.05] text-[12px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] inline-flex items-center gap-1"><UserPlus size={13} /> 개인</button>
                      <button onClick={() => setPicker("TEAM")} className="h-8 px-3 rounded-full bg-black/[0.05] text-[12px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] inline-flex items-center gap-1"><Users size={13} /> 팀</button>
                    </div>
                  }
                >
                  {a.entries.length === 0 ? (
                    <p className="text-[13px] text-[#8E8E93] rounded-2xl bg-[#F5F5F7] px-4 py-10 text-center">
                      개인으로 넣으면 한 사람씩, 팀으로 넣으면 한 칸에 묶여요.<br />압축 파일에서 이 칸마다 폴더가 생겨요.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                      {a.entries.map((e) => (
                        <EntryCard
                          key={e.id}
                          entry={e}
                          members={members}
                          pending={pending}
                          onSave={(req) => call(() => api.put(`/admin/achievements/entries/${e.id}`, req))}
                          onSplit={() => call(() => api.post(`/admin/achievements/entries/${e.id}/split`))}
                          onDelete={() => {
                            if (!confirm(`이 참가 칸을 지울까요?${e.files.length ? `\n올린 파일 ${e.files.length}개도 함께 지워져요.` : ""}`)) return;
                            call(() => api.delete(`/admin/achievements/entries/${e.id}`));
                          }}
                          onUpload={(files, cat) => upload(files, cat, e.id)}
                          onOpenFile={(files, index) => setLightbox({ files, index })}
                          onRemoveFile={removeFile}
                        />
                      ))}
                    </div>
                  )}
                </Section>
              ) : (
                <>
                  <Section
                    title={`참석 인원 ${a.participants.length ? `${a.participants.length}명` : ""}`}
                    icon={Users}
                    right={
                      <div className="flex gap-1.5">
                        {a.fromDiscord && (
                          <button onClick={resyncDiscord} disabled={syncing} className="h-8 px-3 rounded-full bg-[#5865F2]/[0.1] text-[12px] font-semibold text-[#4752C4] hover:bg-[#5865F2]/[0.16] inline-flex items-center gap-1 disabled:opacity-60">
                            {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} 디스코드 반응 다시
                          </button>
                        )}
                        <button onClick={() => setPicker("PARTICIPANTS")} className="h-8 px-3 rounded-full bg-black/[0.05] text-[12px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] inline-flex items-center gap-1"><UserPlus size={13} /> 사람</button>
                      </div>
                    }
                  >
                    {a.participants.length === 0 ? (
                      <p className="text-[13px] text-[#8E8E93] rounded-2xl bg-[#F5F5F7] px-4 py-6 text-center">
                        {a.fromDiscord ? "디스코드 공지에 '총회 참석'으로 반응한 사람이 없어요." : "참석한 사람을 넣으면 압축 파일에 참석자.xlsx로 들어가요."}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {a.participants.map((m, i) => (
                          <span key={`${m.loginId ?? m.name}-${i}`} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-[#F5F5F7] text-[13px] font-semibold text-[#1D1D1F]">
                            {memberLabel(m)}
                            {!m.loginId && <span className="text-[10px] text-[#8E8E93] font-medium">외부</span>}
                            <button
                              aria-label={`${m.name} 빼기`}
                              onClick={() => setParticipants(a.participants.filter((_, j) => j !== i))}
                              className="w-6 h-6 rounded-full text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] flex items-center justify-center"
                            ><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </Section>
                  <Section title="자료" icon={Paperclip}>{recordSlots}</Section>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Portal>
        <AnimatePresence>
          {picker && (
            <MemberPicker
              key="picker"
              mode={picker === "INDIVIDUAL" ? "INDIVIDUAL" : "TEAM"}
              title={picker === "PARTICIPANTS" ? "참석 인원 추가" : undefined}
              members={members}
              exclude={picker === "PARTICIPANTS" ? (a.participants.map((m) => m.loginId).filter(Boolean) as string[]) : []}
              onClose={() => setPicker(null)}
              onPick={pick}
            />
          )}
          {lightbox && (
            <Lightbox
              key="lightbox"
              files={lightbox.files}
              index={lightbox.index}
              onIndex={(i) => setLightbox({ ...lightbox, index: i })}
              onClose={() => setLightbox(null)}
              onRemove={async (f) => {
                if (await removeFile(f)) {
                  const rest = lightbox.files.filter((x) => x.id !== f.id);
                  setLightbox(rest.length ? { files: rest, index: Math.min(lightbox.index, rest.length - 1) } : null);
                }
              }}
            />
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

// 겹쳐 뜨는 창(사람 고르기·사진 보기)은 상세 창 밖(main)에 띄운다 — 움직이는 창 안에 두면 위치가 같이 밀린다
const Portal = ({ children }: { children: ReactNode }) => createPortal(children, document.querySelector("main") ?? document.body);

// ---------- 참가 칸 ----------

const EntryCard = ({ entry, members, pending, onSave, onSplit, onDelete, onUpload, onOpenFile, onRemoveFile }: {
  entry: Entry; members: MemberLite[]; pending: Record<string, number>;
  onSave: (req: { name: string | null; award: string | null; members: MemberRef[] }) => void;
  onSplit: () => void; onDelete: () => void;
  onUpload: (files: File[], cat: Cat) => void;
  onOpenFile: (files: FileItem[], index: number) => void;
  onRemoveFile: (f: FileItem) => Promise<boolean>;
}) => {
  const [award, setAward] = useState(entry.award || "");
  const [name, setName] = useState(entry.name || "");
  const [adding, setAdding] = useState(false);
  useEffect(() => { setAward(entry.award || ""); setName(entry.name || ""); }, [entry.award, entry.name]);

  const commit = (patch: Partial<{ award: string; name: string; members: MemberRef[] }> = {}) => {
    const next = { award: patch.award ?? award, name: patch.name ?? name, members: patch.members ?? entry.members };
    if (next.award === (entry.award || "") && next.name === (entry.name || "") && !patch.members) return;
    onSave({ award: next.award || null, name: next.name || null, members: next.members });
  };

  return (
    <div className="rounded-[20px] bg-[#F5F5F7] p-3.5 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Trophy size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF9F0A] pointer-events-none" />
          <input
            list="ach-awards"
            value={award}
            onChange={(e) => setAward(e.target.value)}
            onBlur={() => commit()}
            placeholder="상 (예: 대상)"
            className="bare-field w-[150px] h-9 pl-8 pr-3 rounded-full bg-[#fff] text-[13px] font-bold text-[#B25000] outline-none shadow-[0_0_0_0.5px_rgb(0_0_0/0.06)]"
          />
        </div>
        {entry.members.length > 1 && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => commit()}
            placeholder="팀 이름 (선택)"
            className="bare-field w-[150px] h-9 px-3 rounded-full bg-[#fff] text-[13px] font-semibold outline-none shadow-[0_0_0_0.5px_rgb(0_0_0/0.06)]"
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          {entry.members.length > 1 && (
            <IconButton label="한 명씩 나누기" onClick={onSplit}><Scissors size={14} /></IconButton>
          )}
          <IconButton label="참가 칸 삭제" danger onClick={onDelete}><Trash2 size={14} /></IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {entry.members.map((m, i) => (
          <span key={`${m.loginId}-${i}`} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-full bg-[#fff] text-[13px] font-semibold text-[#1D1D1F] shadow-[0_0_0_0.5px_rgb(0_0_0/0.06)]">
            {memberLabel(m)}
            {!m.loginId && <span className="text-[10px] text-[#8E8E93] font-medium">외부</span>}
            <button
              aria-label={`${m.name} 빼기`}
              onClick={() => commit({ members: entry.members.filter((_, j) => j !== i) })}
              className="w-6 h-6 rounded-full text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] flex items-center justify-center"
            ><X size={12} /></button>
          </span>
        ))}
        <button onClick={() => setAdding(true)} className="h-8 px-3 rounded-full border border-dashed border-black/15 text-[12px] font-semibold text-[#6E6E73] hover:text-[#0071E3] hover:border-[#0071E3]/40 inline-flex items-center gap-1">
          <Plus size={12} /> 사람
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        {ENTRY_SLOTS.map((cat) => (
          <FileSlot
            key={cat}
            compact
            category={cat}
            files={entry.files.filter((f) => f.category === cat)}
            pending={pending[`${entry.id}:${cat}`] || 0}
            onUpload={(files) => onUpload(files, cat)}
            onOpen={onOpenFile}
            onRemove={onRemoveFile}
          />
        ))}
      </div>

      <Portal>
        <AnimatePresence>
          {adding && (
            <MemberPicker
              mode="TEAM"
              title="사람 추가"
              members={members}
              exclude={entry.members.map((m) => m.loginId).filter(Boolean) as string[]}
              onClose={() => setAdding(false)}
              onPick={(picked) => { setAdding(false); if (picked.length) commit({ members: [...entry.members, ...picked] }); }}
            />
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
};

// ---------- 파일 칸 ----------

const FileSlot = ({ category, files, pending, onUpload, onOpen, onRemove, compact }: {
  category: Cat; files: FileItem[]; pending: number; compact?: boolean;
  onUpload: (files: File[]) => void;
  onOpen: (files: FileItem[], index: number) => void;
  onRemove: (f: FileItem) => Promise<boolean>;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const meta = CATS[category];
  const photos = category === "PHOTO";

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const list = Array.from(e.dataTransfer.files || []);
    if (list.length) onUpload(list);
  };

  const openFile = (f: FileItem) => {
    if (f.image) {
      const imgs = files.filter((x) => x.image);
      onOpen(imgs, imgs.findIndex((x) => x.id === f.id));
    } else {
      download("FILE", { id: f.id });
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-2xl transition-colors ${compact ? "bg-[#fff] p-2.5" : "bg-[#F5F5F7] p-3"} ${over ? "ring-2 ring-[#0071E3]/50 bg-[#0071E3]/[0.04]" : ""}`}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={photos ? "image/*" : undefined}
        className="hidden"
        onChange={(e) => { const list = Array.from(e.target.files || []); e.target.value = ""; if (list.length) onUpload(list); }}
      />
      <div className="flex items-center gap-2">
        <meta.icon size={14} className="text-[#8E8E93] shrink-0" />
        <span className="text-[13px] font-semibold text-[#1D1D1F]">{meta.label}</span>
        {files.length > 0 && <span className="text-[12px] text-[#8E8E93] tabular-nums">{files.length}</span>}
        {pending > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0071E3]"><Loader2 size={11} className="animate-spin" /> {pending}개 올리는 중</span>
        )}
        <button
          onClick={() => input.current?.click()}
          className="ml-auto h-7 px-2.5 rounded-full text-[12px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.08] inline-flex items-center gap-1"
        >
          <Plus size={12} /> 추가
        </button>
      </div>

      {files.length === 0 ? (
        <button onClick={() => input.current?.click()} className="w-full mt-2 py-3 rounded-xl border border-dashed border-black/[0.1] text-[12px] text-[#AEAEB2] hover:text-[#0071E3] hover:border-[#0071E3]/30 transition-colors">
          파일을 끌어다 놓거나 눌러서 선택
        </button>
      ) : photos ? (
        <div className={`grid gap-1.5 mt-2 ${compact ? "grid-cols-4" : "grid-cols-4 sm:grid-cols-6"}`}>
          {files.map((f) => (
            <button key={f.id} onClick={() => openFile(f)} className="relative group rounded-[10px] overflow-hidden">
              <Thumb file={f} className="w-full aspect-square" />
              {!f.image && <span className="absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] bg-black/50 text-white truncate">{f.name}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 divide-y divide-black/[0.05]">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 py-1.5">
              <button onClick={() => openFile(f)} className="min-w-0 flex-1 text-left group">
                <p className="text-[13px] font-medium text-[#1D1D1F] truncate group-hover:text-[#0071E3]">{f.name}</p>
                <p className="text-[11px] text-[#8E8E93]">{fmtSize(f.size)}</p>
              </button>
              <button aria-label="내려받기" onClick={() => download("FILE", { id: f.id })} className="w-7 h-7 rounded-full text-[#AEAEB2] hover:text-[#0071E3] hover:bg-[#0071E3]/[0.08] flex items-center justify-center"><Download size={13} /></button>
              <button aria-label="삭제" onClick={() => onRemove(f)} className="w-7 h-7 rounded-full text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] flex items-center justify-center"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- 사람 고르기 ----------

const MemberPicker = ({ mode, title, members, exclude = [], onClose, onPick }: {
  mode: "INDIVIDUAL" | "TEAM"; title?: string; members: MemberLite[]; exclude?: string[];
  onClose: () => void; onPick: (picked: MemberRef[]) => void;
}) => {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<MemberRef[]>([]);
  const query = q.trim().toLowerCase();
  const results = useMemo(() => members
    .filter((m) => !exclude.includes(m.loginId))
    .filter((m) => !query || m.name?.toLowerCase().includes(query) || m.studentId?.includes(query) || shortId(m.studentId) === query)
    .slice(0, 60), [members, query, exclude]);
  const isPicked = (loginId: string) => picked.some((p) => p.loginId === loginId);
  const toggle = (m: MemberLite) => setPicked((p) => isPicked(m.loginId)
    ? p.filter((x) => x.loginId !== m.loginId)
    : [...p, { loginId: m.loginId, name: m.name, studentId: m.studentId }]);

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/25" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="relative w-full max-w-sm bg-[#fff] rounded-[24px] shadow-[0_20px_60px_rgb(0_0_0/0.2)] overflow-hidden"
      >
        <div className="write-page p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[16px] font-bold text-[#1D1D1F]">{title || (mode === "TEAM" ? "팀으로 추가" : "개인으로 추가")}</h4>
            <CloseButton onClick={onClose} />
          </div>
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 또는 학번" className="w-full h-11 pl-10 pr-3 rounded-xl text-[14px] outline-none" />
          </div>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {picked.map((p) => <span key={p.loginId || p.name || ""} className="h-6 px-2 rounded-full bg-[#0071E3]/10 text-[#0062CC] text-[11px] font-semibold inline-flex items-center">{memberLabel(p)}</span>)}
            </div>
          )}
          <div className="max-h-[300px] overflow-y-auto -mx-1">
            {results.map((m) => (
              <button key={m.loginId} onClick={() => toggle(m)} className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-left transition-colors ${isPicked(m.loginId) ? "bg-[#0071E3]/[0.08]" : "hover:bg-black/[0.04]"}`}>
                <span className="w-8 h-8 rounded-full overflow-hidden bg-[#E5E5EA] shrink-0 flex items-center justify-center text-[11px] font-bold text-[#6E6E73]">
                  {m.profileImage ? <img src={m.profileImage} alt="" className="w-full h-full object-cover" /> : m.name?.[0]}
                </span>
                <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#1D1D1F] truncate">{m.name}</span>
                <span className="text-[12px] text-[#8E8E93] tabular-nums">{shortId(m.studentId)}</span>
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${isPicked(m.loginId) ? "bg-[#0071E3] border-[#0071E3] text-white" : "border-black/15"}`}>
                  {isPicked(m.loginId) && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2.5 6.5l2.2 2.2L9.5 3.8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
              </button>
            ))}
            {query && (
              <button
                onClick={() => setPicked((p) => [...p, { loginId: null, name: q.trim(), studentId: null }])}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left text-[13px] font-semibold text-[#0071E3] hover:bg-[#0071E3]/[0.06]"
              >
                <Plus size={14} /> "{q.trim()}" 외부 인원으로 추가
              </button>
            )}
            {!query && results.length === 0 && <p className="text-center text-[13px] text-[#8E8E93] py-6">부원 목록이 없어요.</p>}
          </div>
          <button
            onClick={() => onPick(picked)}
            disabled={!picked.length}
            className="w-full h-11 mt-3 rounded-full bg-[#0071E3] text-white text-[14px] font-semibold disabled:opacity-40"
          >
            {picked.length ? (mode === "TEAM" ? `${picked.length}명 넣기` : `${picked.length}명 각각 넣기`) : "사람을 골라주세요"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------- 사진 크게 보기 ----------

const Lightbox = ({ files, index, onIndex, onClose, onRemove }: {
  files: FileItem[]; index: number; onIndex: (i: number) => void; onClose: () => void; onRemove: (f: FileItem) => void;
}) => {
  const file = files[index];
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    api.get(`/admin/achievements/files/${file.id}/raw`, { responseType: "blob" })
      .then((r) => { made = URL.createObjectURL(r.data); if (alive) setUrl(made); })
      .catch(() => loadThumb(file.id).then((u) => { if (alive) setUrl(u); }));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [file.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < files.length - 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, files.length]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[340] bg-black/85 backdrop-blur-md flex flex-col">
      <div className="flex items-center gap-2 px-4 h-14 text-white shrink-0">
        <span className="text-[13px] font-medium truncate flex-1">{file.name}</span>
        <span className="text-[12px] text-white/60 tabular-nums">{index + 1} / {files.length}</span>
        <button aria-label="내려받기" onClick={() => download("FILE", { id: file.id })} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"><Download size={17} /></button>
        <button aria-label="삭제" onClick={() => onRemove(file)} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center text-[#FF6961]"><Trash2 size={17} /></button>
        <button aria-label="닫기" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center"><X size={18} /></button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 pb-6" onClick={onClose}>
        {url ? (
          <img src={url} alt={file.name} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full object-contain rounded-lg" />
        ) : (
          <Loader2 className="animate-spin text-white/70" />
        )}
        {index > 0 && (
          <button aria-label="이전" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><ChevronLeft size={22} /></button>
        )}
        {index < files.length - 1 && (
          <button aria-label="다음" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><ChevronRight size={22} /></button>
        )}
      </div>
    </motion.div>
  );
};

// ---------- 공통 조각 ----------

const Modal = ({ children, onClose, width, padded = true }: { children: ReactNode; onClose: () => void; width: string; padded?: boolean }) => (
  <div className="fixed inset-0 z-[300] overflow-y-auto">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
    <div className="relative min-h-full flex items-start md:items-center justify-center px-3 md:px-4 pt-[76px] md:pt-[88px] pb-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 14 }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className={`relative w-full ${width} bg-[#fff] rounded-[28px] shadow-[0_20px_60px_rgb(0_0_0/0.18)]`}
      >
        <div className={`write-page rounded-[28px] ${padded ? "p-6 md:p-7" : ""}`}>{children}</div>
      </motion.div>
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="mb-3">
    <label className="block text-xs font-semibold text-[#6E6E73] mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);

const Section = ({ title, icon: Icon, right, children }: { title: string; icon: typeof Users; right?: ReactNode; children: ReactNode }) => (
  <section>
    <div className="flex items-center gap-2 mb-2.5">
      <Icon size={15} className="text-[#8E8E93]" />
      <h4 className="text-[15px] font-bold text-[#1D1D1F]">{title}</h4>
      <div className="ml-auto">{right}</div>
    </div>
    {children}
  </section>
);

const IconButton = ({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) => (
  <button
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center transition-colors ${danger ? "text-[#6E6E73] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08]" : "text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#0071E3]/[0.08]"}`}
  >{children}</button>
);

const CloseButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} aria-label="닫기" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center hover:bg-black/[0.08] shrink-0"><X size={16} /></button>
);

