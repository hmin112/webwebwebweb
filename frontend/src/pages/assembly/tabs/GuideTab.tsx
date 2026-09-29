import { useEffect, useRef, useState, type ReactNode } from "react";
import { MonthCard as RealMonthCard, StatusBadge, reportKind } from "../assemblyUi";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, BookOpen, CalendarDays, Check, CheckCircle2, CheckSquare, ChevronDown,
  ChevronRight, Clock, Crown, Download, Edit2, ExternalLink, Eye, FileArchive, FileDown, FileText,
  FileUp, Layers, Lightbulb, Link2, ListChecks, Loader2, Lock, Mail, MessageCircle,
  MousePointerClick, Plus, PlusCircle, Presentation, RotateCcw, Route, Search, Send, Target,
  Trash2, UserCircle, UserPlus, Users, X,
} from "lucide-react";

// ✨ [2026-09-29 신규] 총회 탭 "사용법" — 관리자 기능을 뺀 부원용 기능을 실제 화면과 같은 UI로 보여주고,
// 체험 화면은 직접 눌러볼 수 있게 만든 가이드. 체험 화면은 전부 가짜 데이터로 동작하며 서버와 통신하지 않는다.

// ---------------------------------------------------------------------------
// 공통 조각
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "guide-start", label: "시작하기", icon: <BookOpen size={14} /> },
  { id: "guide-mypage", label: "마이 페이지", icon: <UserCircle size={14} /> },
  { id: "guide-plan", label: "계획서", icon: <Target size={14} /> },
  { id: "guide-community", label: "커뮤니티", icon: <Users size={14} /> },
  { id: "guide-team", label: "팀 프로젝트", icon: <Layers size={14} /> },
  { id: "guide-attendance", label: "출석", icon: <CheckSquare size={14} /> },
  { id: "guide-faq", label: "자주 묻는 질문", icon: <MessageCircle size={14} /> },
];

export const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export const Avatar = ({ name, size = "w-8 h-8", tone = "bg-[#E0E7FF] text-[#0071E3]" }: { name: string; size?: string; tone?: string }) => (
  <div className={`${size} ${tone} rounded-full flex items-center justify-center font-bold text-xs shrink-0`}>{name[0]}</div>
);

export const Section = ({
  id, no, icon, title, desc, children,
}: { id: string; no: string; icon: ReactNode; title: string; desc: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-28 lg:scroll-mt-8 mb-20 md:mb-28">
    <div className="flex items-start gap-3 md:gap-4 mb-6 md:mb-8">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-bold text-[#0071E3] uppercase tracking-[0.2em] mb-0.5">STEP {no}</p>
        <h2 className="text-xl md:text-3xl font-bold text-[#1D1D1F] tracking-tight">{title}</h2>
        <p className="text-xs md:text-sm text-[#6E6E73] font-medium mt-1.5 leading-relaxed">{desc}</p>
      </div>
    </div>
    {children}
  </section>
);

// 실제 화면을 담는 틀 — 상단 바에 "직접 눌러보세요" 안내와 처음으로 되돌리기 버튼
export const DemoFrame = ({
  label, hint = "직접 눌러보세요", onReset, children, minH = "",
}: { label: string; hint?: string; onReset?: () => void; children: ReactNode; minH?: string }) => (
  <div className="rounded-[1.75rem] md:rounded-[2.25rem] bg-black/[0.05]/80 border border-black/[0.08]/70 p-2 md:p-3 shadow-inner">
    <div className="flex items-center justify-between gap-2 px-2.5 md:px-3 pt-1 pb-2.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[10px] md:text-[11px] font-bold text-[#8E8E93] truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[#FF3B30]">
          <MousePointerClick size={12} /> {hint}
        </span>
        {onReset && (
          <button onClick={onReset} className="flex items-center gap-1 text-[10px] font-bold text-[#8E8E93] hover:text-[#1D1D1F] px-2 py-1 rounded-lg hover:bg-[#fff]">
            <RotateCcw size={11} /> 처음으로
          </button>
        )}
      </div>
    </div>
    <div className={`relative bg-[#F8FAFC] rounded-[1.4rem] md:rounded-[1.75rem] p-3 md:p-6 overflow-hidden ${minH}`}>{children}</div>
  </div>
);

// 화면 위에 찍는 번호 표시 — 오른쪽 설명(Steps)의 번호와 짝
export const Pin = ({ n, className = "" }: { n: number; className?: string }) => (
  <span className={`absolute z-10 w-5 h-5 rounded-full bg-[#EC4899] text-white text-[10px] font-bold flex items-center justify-center shadow-md ring-2 ring-white pointer-events-none ${className}`}>
    {n}
  </span>
);

export const Steps = ({ items }: { items: { title: string; body: ReactNode }[] }) => (
  <ol className="space-y-4 md:space-y-5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3">
        <span className="w-6 h-6 rounded-full bg-[#EC4899] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
        <div className="min-w-0">
          <p className="text-sm md:text-[15px] font-bold text-[#1D1D1F]">{it.title}</p>
          <div className="text-xs md:text-sm text-[#6E6E73] font-medium leading-relaxed mt-0.5">{it.body}</div>
        </div>
      </li>
    ))}
  </ol>
);

export const Note = ({ tone = "tip", children }: { tone?: "tip" | "warn"; children: ReactNode }) => (
  <div className={`flex gap-2.5 p-3.5 md:p-4 rounded-2xl border text-xs md:text-sm font-medium leading-relaxed ${
    tone === "tip" ? "bg-[#EEF2FF]/70 border-[#0071E3]/20 text-indigo-900" : "bg-amber-50 border-amber-100 text-amber-900"
  }`}>
    {tone === "tip" ? <Lightbulb size={16} className="text-[#0071E3] shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
    <div className="min-w-0">{children}</div>
  </div>
);

export const TwoCol = ({ demo, side }: { demo: ReactNode; side: ReactNode }) => (
  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-6 md:gap-8 items-start mb-8 md:mb-10">
    <div className="min-w-0">{demo}</div>
    <div className="min-w-0 xl:sticky xl:top-8">{side}</div>
  </div>
);

export const SubTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="text-base md:text-lg font-bold text-[#1D1D1F] mb-4 flex items-center gap-2">
    <span className="w-1.5 h-5 rounded-full bg-[#6366F1]" /> {children}
  </h3>
);

// 실제 화면의 상태 배지와 동일
type MonthCard = { month: number; type: "PLAN" | "PROGRESS" | "RESULT"; state: "done" | "open" | "closed"; title?: string; date?: string; startDate?: string };

// 달별 카드 — ✨ [2026-09-30] 실제 화면과 같은 공통 카드(assemblyUi.MonthCard)를 그대로 사용
const MonthCardView = ({ card, onClick, pin, team }: { card: MonthCard; onClick?: () => void; pin?: number; team?: boolean }) => (
  <div className="relative">
    {pin && <Pin n={pin} className="-top-2 -left-2 z-20" />}
    <RealMonthCard
      month={card.month}
      title={card.title}
      state={card.state === "closed" ? "upcoming" : card.state}
      date={card.date}
      startDate={card.startDate}
      endDate={card.state === "open" ? "2026-10-15" : undefined}
      extra={team && card.state === "done" ? "김데브" : undefined}
      onClick={onClick}
    />
  </div>
);

// 실제 화면의 파일 칸(UploadSlot)
const UploadSlotView = ({ label, fileName, onClick, pin }: { label: string; fileName?: string; onClick?: () => void; pin?: number }) => (
  <div onClick={onClick} className={`relative flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${onClick ? "cursor-pointer" : ""} ${fileName ? "bg-[#EEF2FF] border-[#0071E3]/20" : "bg-[#F8FAFC] border-black/[0.06] hover:border-[#0071E3]/30"}`}>
    {pin && <Pin n={pin} className="-top-2 -right-2" />}
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${fileName ? "bg-[#4F46E5] text-white" : "bg-[#fff] text-[#8E8E93] border"}`}>
        {label === "발표자료" ? <Presentation size={15} /> : label === "PDF" ? <FileText size={15} /> : <FileArchive size={15} />}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] md:text-sm font-bold text-[#1D1D1F]">{label}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-[#8E8E93] uppercase truncate">{fileName || "끌어다 놓거나 선택"}</p>
      </div>
    </div>
    <Plus size={15} className={fileName ? "text-[#0071E3]/70" : "text-[#C7C7CC]"} />
  </div>
);

// 체험 화면 안에서 뜨는 팝업(실제 화면의 모달과 같은 모양, 틀 안에만 뜬다)
export const DemoModal = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) => (
  <AnimatePresence>
    {open && (
      <div className="absolute inset-0 z-20 flex items-center justify-center p-3 md:p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="relative w-full max-w-md bg-[#fff] rounded-[1.75rem] md:rounded-[2.25rem] p-5 md:p-7 shadow-2xl max-h-full overflow-y-auto"
        >
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// 0. 시작하기
// ---------------------------------------------------------------------------

const MENU_INFO = [
  { id: "mypage", name: "마이 페이지", icon: <UserCircle size={18} />, desc: "내 개인 총회자료를 달마다 제출하고, 계획서를 작성하는 곳이에요. 학기별 Git·Notion 링크도 여기서 관리해요.", go: "guide-mypage" },
  { id: "community", name: "커뮤니티", icon: <Users size={18} />, desc: "모든 부원의 프로젝트와 제출 자료를 둘러보는 곳이에요. 부원을 누르면 개인·팀 프로젝트와 달별 자료가 보여요.", go: "guide-community" },
  { id: "team", name: "팀 프로젝트", icon: <Layers size={18} />, desc: "팀을 만들고 팀원을 초대해서, 팀 공유 자료와 팀 계획서를 함께 제출하는 곳이에요.", go: "guide-team" },
  { id: "attendance", name: "출석", icon: <CheckSquare size={18} />, desc: "총회 날 화면에 뜬 3자리 인증번호를 입력해서 출석하는 곳이에요.", go: "guide-attendance" },
];

const FLOW = [
  { month: "3월 · 9월", type: "PLAN", title: "계획서", desc: "이번 학기에 무엇을 할지 — 웹에서 작성하거나 파일로 올려요", color: "from-indigo-500 to-indigo-600" },
  { month: "4·5월 · 10·11월", type: "PROGRESS", title: "진행 보고", desc: "한 달 동안의 활동 요약 + 발표자료·PDF 제출", color: "from-violet-500 to-violet-600" },
  { month: "6월 · 12월", type: "RESULT", title: "결과 보고", desc: "학기 결과물 정리 + 발표자료·PDF 제출", color: "from-pink-500 to-pink-600" },
];

const StartSection = () => {
  const [active, setActive] = useState("mypage");
  const info = MENU_INFO.find((m) => m.id === active)!;
  return (
    <Section id="guide-start" no="0" icon={<BookOpen size={20} />} title="총회 시스템 한눈에 보기" desc="총회 탭은 한 학기 동안의 프로젝트 기록을 모아두는 곳이에요. 왼쪽 메뉴(모바일은 위쪽 탭)에서 기능을 고를 수 있어요.">
      <TwoCol
        demo={
          <DemoFrame label="devsign.co.kr/assembly · 왼쪽 메뉴" hint="메뉴를 눌러보세요">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-5">
              <div className="sm:w-56 bg-[#fff] rounded-2xl border border-black/[0.06] p-3 md:p-4 shrink-0">
                <div className="mb-5 px-2">
                  <div className="flex items-center gap-2 text-[#0071E3] mb-1">
                    <Layers size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">총회 시스템</span>
                  </div>
                  <p className="text-lg font-bold text-[#1D1D1F] tracking-tight">DEVSIGN</p>
                </div>
                <div className="space-y-1">
                  {MENU_INFO.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActive(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${active === m.id ? "bg-[#EEF2FF] text-[#0071E3]" : "text-[#6E6E73] hover:bg-[#F8FAFC]"}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={active === m.id ? "" : "text-[#8E8E93]"}>{m.icon}</span>
                        <span className="font-bold text-[13px]">{m.name}</span>
                      </span>
                      {active === m.id && <ChevronRight size={14} />}
                    </button>
                  ))}
                  <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#EEF2FF]/50 text-[#0071E3]/70">
                    <BookOpen size={18} /> <span className="font-bold text-[13px]">사용법</span>
                  </div>
                </div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={info.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex-1 bg-[#fff] rounded-2xl border border-black/[0.06] p-5 md:p-6 flex flex-col"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#0071E3] flex items-center justify-center mb-3">{info.icon}</div>
                  <p className="text-lg font-bold text-[#1D1D1F] mb-1.5">{info.name}</p>
                  <p className="text-xs md:text-sm text-[#6E6E73] font-medium leading-relaxed flex-1">{info.desc}</p>
                  <button onClick={() => scrollToSection(info.go)} className="mt-4 self-start flex items-center gap-1 text-xs font-bold text-[#0071E3] hover:text-[#0062C4]">
                    자세한 사용법 보기 <ChevronRight size={14} />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <div>
              <SubTitle>한 학기의 흐름</SubTitle>
              <div className="space-y-2.5">
                {FLOW.map((f, i) => (
                  <div key={f.type} className="relative flex items-stretch gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${f.color} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}>{i + 1}</div>
                      {i < FLOW.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="bg-[#fff] rounded-2xl border border-black/[0.06] px-4 py-3 flex-1 min-w-0 mb-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-bold text-[#1D1D1F]">{f.title}</span>
                        <span className="text-[11px] font-bold text-[#8E8E93]">{f.month}</span>
                      </div>
                      <p className="text-xs text-[#6E6E73] font-medium">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SubTitle>상태 표시 읽는 법</SubTitle>
              <div className="bg-[#fff] rounded-2xl border border-black/[0.06] p-4 space-y-3">
                {[
                  { s: "done" as const, t: "제출을 마친 달이에요. 기간 안이면 다시 눌러서 수정할 수 있어요." },
                  { s: "open" as const, t: "지금 제출할 수 있는 달이에요. 언제까지인지 카드에 나와요." },
                  { s: "upcoming" as const, t: "아직 제출 기간이 아닌 달이에요. 언제부터인지 카드에 나와요." },
                  { s: "past" as const, t: "제출 기간이 끝난 달이에요. 읽기 전용으로 잠겨요." },
                ].map((row) => (
                  <div key={row.s} className="flex items-start gap-3">
                    <div className="w-[76px] shrink-0 flex"><StatusBadge state={row.s} /></div>
                    <p className="text-xs md:text-sm text-[#6E6E73] font-medium leading-relaxed">{row.t}</p>
                  </div>
                ))}
              </div>
            </div>
            <Note tone="warn">제출 기간은 운영진이 달마다 정해요. <b>기간 안에서만</b> 제출·수정할 수 있고, 기간이 지나면 읽기 전용으로 잠겨요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 1. 마이 페이지
// ---------------------------------------------------------------------------

const INITIAL_MONTHS: MonthCard[] = [
  { month: 9, type: "PLAN", state: "done", title: "스마트홈 IoT 프로젝트", date: "2026.09.12" },
  { month: 10, type: "PROGRESS", state: "open" },
  { month: 11, type: "PROGRESS", state: "closed", startDate: "2026-11-01" },
  { month: 12, type: "RESULT", state: "closed", startDate: "2026-12-01" },
];

const MyPageSection = () => {
  const [months, setMonths] = useState<MonthCard[]>(INITIAL_MONTHS);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [files, setFiles] = useState<{ pres?: string; pdf?: string; other?: string }>({});
  const [planNotice, setPlanNotice] = useState(false);
  const [links, setLinks] = useState([{ label: "Git", url: "https://github.com/devsign/smarthome" }, { label: "Notion", url: "" }]);
  const [linkSaved, setLinkSaved] = useState(false);

  const reset = () => {
    setMonths(INITIAL_MONTHS);
    setOpenMonth(null);
    setMemo("");
    setFiles({});
    setPlanNotice(false);
    setLinkSaved(false);
    setLinks([{ label: "Git", url: "https://github.com/devsign/smarthome" }, { label: "Notion", url: "" }]);
  };
  const card = months.find((m) => m.month === openMonth);
  const canSubmit = Boolean(files.pres || files.pdf || files.other);
  const submit = () => {
    setMonths((prev) => prev.map((m) => (m.month === openMonth ? { ...m, state: "done", title: memo.trim() || undefined, date: "2026.10.14" } : m)));
    setOpenMonth(null);
  };

  return (
    <Section id="guide-mypage" no="1" icon={<UserCircle size={20} />} title="마이 페이지 — 개인 총회자료 제출" desc="달마다 내 활동을 정리해서 올리는 곳이에요. 달 카드를 누르면 제출 창이 열리고, 3월·9월은 계획서 작성 페이지로 이동해요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 마이 페이지" onReset={reset} minH="min-h-[560px]">
            {/* 헤더: 학기 선택 + 제출 현황 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1 h-11 flex items-center gap-2 bg-[#fff] px-3 rounded-xl border border-black/[0.06] shadow-sm min-w-0">
                <Pin n={1} className="-top-2 -left-2" />
                <CalendarDays className="text-[#0071E3] shrink-0" size={15} />
                <span className="font-bold text-[#1D1D1F] text-xs md:text-sm truncate">2026년도 2학기</span>
                <ChevronDown className="ml-auto text-[#8E8E93] shrink-0" size={14} />
              </div>
              <div className="h-11 flex items-center gap-2 bg-[#fff] px-3 rounded-xl border border-black/[0.06] shadow-sm flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center border text-[#0071E3] bg-[#EEF2FF] border-[#0071E3]/20 shrink-0"><FileText size={14} /></div>
                <span className="text-[9px] font-bold text-[#8E8E93] truncate">제출 현황</span>
                <span className="ml-auto text-sm font-bold text-[#1D1D1F]">{months.filter((m) => m.state === "done").length} / 4</span>
              </div>
            </div>

            {/* 관련 링크 */}
            <div className="relative bg-[#fff] p-3.5 md:p-5 rounded-2xl border border-black/[0.06] shadow-sm mb-5">
              <Pin n={2} className="-top-2 -left-2" />
              <div className="flex items-center justify-between mb-3">
                <p className="flex items-center gap-1.5 text-[#0071E3] text-[10px] font-bold uppercase tracking-wide"><Link2 size={13} /> 관련 링크 (2026년 2학기)</p>
                <button onClick={() => setLinkSaved(true)} className="text-[10px] md:text-xs font-bold text-[#0071E3]">{linkSaved ? "저장됨 ✓" : "저장"}</button>
              </div>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={l.label} onChange={(e) => { setLinkSaved(false); setLinks((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))); }} className="w-20 md:w-28 shrink-0 px-2.5 py-2 bg-[#F8FAFC] rounded-lg outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-[11px] md:text-xs" />
                    <input value={l.url} placeholder="https://..." onChange={(e) => { setLinkSaved(false); setLinks((p) => p.map((x, j) => (j === i ? { ...x, url: e.target.value } : x))); }} className="flex-1 min-w-0 px-2.5 py-2 bg-[#F8FAFC] rounded-lg outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-[11px] md:text-xs" />
                  </div>
                ))}
              </div>
            </div>

            {/* 달별 카드 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider">총회자료 제출</p>
              <p className="text-[10px] md:text-xs font-bold text-[#6E6E73] truncate ml-2">스마트홈 IoT 프로젝트</p>
            </div>
            <div className="space-y-2.5">
              {months.map((m) => (
                <MonthCardView
                  key={m.month}
                  card={m}
                  pin={m.month === 10 ? 3 : undefined}
                  onClick={() => {
                    if (m.type === "PLAN") { setPlanNotice(true); return; }
                    setOpenMonth(m.month);
                    setMemo(m.title || "");
                    setFiles({});
                  }}
                />
              ))}
            </div>

            {/* 제출 창 */}
            <DemoModal open={card !== undefined} onClose={() => setOpenMonth(null)}>
              {card && (
                <>
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#0071E3] text-[9px] font-bold rounded-md uppercase border border-[#0071E3]/20">{card.month}월 자료</span>
                      <h3 className="text-lg md:text-2xl font-bold text-[#1D1D1F] mt-1">{card.state === "done" ? (card.state === "done" && card.month === 10 ? "제출 내용 수정" : "제출 자료 확인") : "신규 자료 제출"}</h3>
                    </div>
                    <button onClick={() => setOpenMonth(null)} className="p-2 bg-[#F8FAFC] text-[#8E8E93] rounded-xl"><X size={16} /></button>
                  </div>
                  {card.state === "closed" && (
                    <div className="mb-4 p-3 bg-slate-900 rounded-xl flex items-center gap-2 text-white">
                      <Lock size={14} className="text-[#0071E3]/70 shrink-0" />
                      <p className="text-[11px] font-bold">현재 제출 및 수정 가능 기간이 아닙니다.</p>
                    </div>
                  )}
                  <div className="relative mb-5">
                    <Pin n={4} className="-top-2 -right-1" />
                    <p className="flex items-center gap-1.5 mb-2 ml-1 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide"><MessageCircle size={13} className="text-[#0071E3]" /> 활동 요약</p>
                    <textarea
                      value={memo}
                      disabled={card.state === "closed"}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="활동 내용을 입력해주세요."
                      className="w-full p-3 bg-[#F8FAFC] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-xs min-h-[70px] resize-none disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-[#8E8E93] ml-1 uppercase mb-2">제출 파일 관리</p>
                  <div className="space-y-2 mb-5">
                    <UploadSlotView label="발표자료" pin={5} fileName={files.pres} onClick={card.state === "closed" ? undefined : () => setFiles((f) => ({ ...f, pres: "10월_진행보고.pptx" }))} />
                    <UploadSlotView label="PDF" fileName={files.pdf} onClick={card.state === "closed" ? undefined : () => setFiles((f) => ({ ...f, pdf: "10월_진행보고.pdf" }))} />
                    <UploadSlotView label="기타 자료" fileName={files.other} onClick={card.state === "closed" ? undefined : () => setFiles((f) => ({ ...f, other: "시연영상.mp4" }))} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setOpenMonth(null)} className="flex-1 py-3 bg-[#F8FAFC] text-[#6E6E73] rounded-xl font-bold text-xs">닫기</button>
                    {card.state !== "closed" && (
                      <button onClick={submit} disabled={!canSubmit} className={`relative flex-[2] py-3 rounded-xl font-bold text-xs ${canSubmit ? "bg-[#4F46E5] text-white shadow-xl" : "bg-black/[0.05] text-[#8E8E93] cursor-not-allowed"}`}>
                        <Pin n={6} className="-top-2 -right-2" />
                        {card.state === "done" ? "수정 저장" : "제출 완료"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </DemoModal>

            <DemoModal open={planNotice} onClose={() => setPlanNotice(false)}>
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] text-[#0071E3] flex items-center justify-center mx-auto mb-3"><Target size={22} /></div>
                <p className="text-base font-bold text-[#1D1D1F] mb-1.5">계획서 달은 작성 페이지로 이동해요</p>
                <p className="text-xs text-[#6E6E73] font-medium leading-relaxed mb-5">3월·9월 카드를 누르면 제출 창 대신<br />계획서 작성 페이지가 열려요.</p>
                <button
                  onClick={() => { setPlanNotice(false); scrollToSection("guide-plan"); }}
                  className="w-full py-3 rounded-xl bg-[#4F46E5] text-white font-bold text-xs"
                >
                  계획서 사용법 보러 가기
                </button>
              </div>
            </DemoModal>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "학기 고르기", body: "위쪽 학기 선택에서 볼 학기를 골라요. 오른쪽 '제출 현황'에 이번 학기에 낸 달 수가 떠요." },
                { title: "관련 링크 저장 (선택)", body: "Git·Notion 같은 프로젝트 링크를 적고 '저장'을 누르면, 커뮤니티에서 내 페이지를 연 사람에게 버튼으로 보여요." },
                { title: "제출할 달 카드 누르기", body: <>'가능'이 붙은 달을 누르면 제출 창이 열려요. <b>체험 화면에서 10월 카드를 눌러보세요.</b></> },
                { title: "활동 요약 쓰기", body: "그 달에 한 일을 짧게 적어요. 제출하면 이 요약이 카드 제목으로 보여요." },
                { title: "파일 올리기", body: <>발표자료(.ppt/.pptx), PDF(.pdf), 기타 자료(형식 자유) 중 <b>하나 이상</b> 필요해요. 칸을 눌러 고르거나 파일을 칸 위로 <b>끌어다 놓아도</b> 돼요.</> },
                { title: "제출 완료", body: "카드가 '완료'로 바뀌어요. 기간 안이면 다시 눌러 '수정 저장'으로 고칠 수 있어요." },
              ]}
            />
            <Note>이미 올린 파일이 있으면 새 파일 없이도 활동 요약만 고쳐서 저장할 수 있어요. 올린 파일은 제출 창에서 내려받아 확인할 수 있어요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 2. 계획서
// ---------------------------------------------------------------------------

type DemoPlan = {
  title: string;
  overview: string;
  goals: string[];
  roadmap: { title: string; start: string; end: string; detail: string }[];
  roles: { name: string; role: string; duties: string }[];
};

const EMPTY_PLAN: DemoPlan = { title: "", overview: "", goals: ["", ""], roadmap: [], roles: [] };
const SAMPLE_PLAN: DemoPlan = {
  title: "스마트홈 IoT 프로젝트",
  overview: "라즈베리파이와 아두이노로 스마트홈 시스템을 직접 설계하고 구현합니다.",
  goals: ["지문인식 도어락 웹 원격 제어 구현", "DHT 센서 기반 실시간 온습도 모니터링", "전력 사용량·예상 전기요금 계산"],
  roadmap: [
    { title: "시스템 설계", start: "2026-09-01", end: "2026-09-14", detail: "회로도 설계 및 개발환경 구축" },
    { title: "도어락 구현", start: "2026-09-15", end: "2026-10-05", detail: "AS608 지문 모듈 연동" },
    { title: "웹 대시보드", start: "2026-10-06", end: "2026-10-31", detail: "React 실시간 제어 UI" },
  ],
  roles: [{ name: "김데브", role: "팀장", duties: "HW 설계 총괄" }, { name: "이자인", role: "팀원", duties: "웹 대시보드" }],
};

const PlanSection = () => {
  const [plan, setPlan] = useState<DemoPlan>(EMPTY_PLAN);
  const [phase, setPhase] = useState<"idle" | "reading" | "done">("idle");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [submitted, setSubmitted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setPlan(EMPTY_PLAN);
    setPhase("idle");
    setSaved("idle");
    setSubmitted(false);
  };
  const simulateUpload = () => {
    if (phase === "reading") return;
    setPhase("reading");
    timers.current.push(setTimeout(() => {
      setPlan(SAMPLE_PLAN);
      setPhase("done");
      setSaved("saving");
      timers.current.push(setTimeout(() => setSaved("saved"), 900));
    }, 1300));
  };
  const canSubmit = plan.title.trim() && plan.overview.trim() && plan.goals.filter((g) => g.trim()).length >= 2 && plan.roadmap.length > 0;
  const times = plan.roadmap.flatMap((r) => [new Date(r.start).getTime(), new Date(r.end).getTime()]);
  const min = times.length ? Math.min(...times) : 0;
  const span = times.length ? Math.max(Math.max(...times) - min, 86400000) : 1;

  return (
    <Section id="guide-plan" no="2" icon={<Target size={20} />} title="계획서 — 웹으로 쓰거나 파일로 올리기" desc="3월·9월은 계획서 달이에요. 웹에서 칸을 채워도 되고, 정해진 양식으로 만든 파일(PDF·Word·한글·PowerPoint)을 올리면 내용이 자동으로 채워져요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 마이 페이지 › 9월 계획서" onReset={reset} hint="'샘플 파일로 체험하기'를 눌러보세요" minH="min-h-[620px]">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-1.5 text-[#8E8E93] font-bold text-xs"><ArrowLeft size={14} /> 마이 페이지로</span>
              <span className="text-[10px] font-bold">
                {saved === "saving" ? <span className="flex items-center gap-1 text-[#8E8E93]"><Loader2 size={11} className="animate-spin" /> 저장 중...</span>
                  : saved === "saved" ? <span className="flex items-center gap-1 text-[#0071E3]"><Check size={11} /> 자동 저장됨</span>
                    : <span className="text-[#C7C7CC]">작성하면 자동으로 저장됩니다</span>}
              </span>
            </div>
            <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#0071E3] text-[9px] font-bold rounded-md border border-[#0071E3]/20">9월 계획서</span>
            <p className="text-xl md:text-2xl font-bold text-[#1D1D1F] tracking-tight mt-1.5 mb-4">{submitted ? "계획서 수정" : "계획서 작성"}</p>

            {/* 파일로 올리기 카드 */}
            <div className="relative bg-[#fff] rounded-2xl border border-black/[0.06] shadow-sm p-4 mb-4">
              <Pin n={1} className="-top-2 -right-2" />
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-0.5"><FileUp size={13} className="text-[#0071E3]" /> 파일로 올리기 (선택)</p>
                  <p className="text-[11px] text-[#6E6E73] font-medium">PDF · Word · 한글 · PowerPoint</p>
                </div>
                <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EEF2FF] text-[#0071E3] text-[10px] font-bold shrink-0"><FileDown size={12} /> 양식 내려받기</span>
              </div>
              {phase === "done" && (
                <div className="flex items-center justify-between gap-2 p-2.5 mb-2 rounded-xl border border-black/[0.06] bg-[#F8FAFC]">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#fff] border border-black/[0.06] text-[#0071E3] flex items-center justify-center shrink-0"><FileText size={14} /></span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[#1D1D1F] truncate">스마트홈_계획서.docx</span>
                      <span className="block text-[9px] font-bold text-[#8E8E93]">첨부된 계획서 원본</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#fff] border border-black/[0.08] text-[#3A3A3C] text-[10px] font-bold shrink-0"><Download size={11} /> 다운로드</span>
                </div>
              )}
              <button
                onClick={simulateUpload}
                className="relative w-full flex items-center justify-center gap-2 px-3 py-4 rounded-xl border-2 border-dashed border-black/[0.08] text-[#8E8E93] hover:border-indigo-300 hover:text-[#0071E3] text-xs font-bold transition-colors"
              >
                {phase === "reading" ? <><Loader2 size={15} className="animate-spin" /> 파일을 읽는 중...</>
                  : phase === "done" ? <><FileUp size={15} /> 다른 파일로 바꾸기</>
                    : <><FileUp size={15} /> 샘플 파일로 체험하기 (실제로는 끌어다 놓거나 선택)</>}
              </button>
              <AnimatePresence>
                {phase === "done" && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 p-3 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-700 text-[11px] font-bold flex items-start gap-2">
                    <CheckCircle2 size={14} className="shrink-0 mt-px" /> 파일에서 5개 항목을 채웠어요 — 아래 내용을 확인한 뒤 제출해주세요
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 작성 폼 */}
            <motion.div layout className="bg-[#fff] rounded-2xl border border-black/[0.06] shadow-sm p-4 md:p-5 space-y-5">
              <div className="relative">
                <Pin n={2} className="-top-2 -right-1" />
                <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">프로젝트 명<span className="text-[#0071E3]/70"> *</span></p>
                <input value={plan.title} onChange={(e) => setPlan((p) => ({ ...p, title: e.target.value }))} placeholder="예: 동아리 웹 프로젝트" className={`w-full p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-xs transition-colors ${phase === "done" ? "bg-emerald-50/60" : "bg-[#F8FAFC]"}`} />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5"><Target size={12} className="text-[#0071E3]" /> 배경 및 목표 개요<span className="text-[#0071E3]/70"> *</span></p>
                <textarea value={plan.overview} onChange={(e) => setPlan((p) => ({ ...p, overview: e.target.value }))} placeholder="이 프로젝트를 왜 하는지, 무엇을 이루고 싶은지 자유롭게 적어주세요." className={`w-full p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-medium text-xs min-h-[56px] resize-none transition-colors ${phase === "done" ? "bg-emerald-50/60" : "bg-[#F8FAFC]"}`} />
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5"><ListChecks size={12} className="text-[#0071E3]" /> 핵심 목표 ({plan.goals.length}/10)<span className="text-[#0071E3]/70"> *</span></p>
                <div className="space-y-1.5">
                  {plan.goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-[#EEF2FF] text-[#0071E3] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <input value={g} onChange={(e) => setPlan((p) => ({ ...p, goals: p.goals.map((x, j) => (j === i ? e.target.value : x)) }))} placeholder="예: 지문인식 도어락 웹 원격 제어 구현" className={`flex-1 min-w-0 px-2.5 py-2 rounded-lg outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-medium text-xs transition-colors ${phase === "done" ? "bg-emerald-50/60" : "bg-[#F8FAFC]"}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Pin n={3} className="-top-2 -right-1" />
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2"><Route size={12} className="text-[#0071E3]" /> 로드맵<span className="text-[#0071E3]/70"> *</span></p>
                {plan.roadmap.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-black/[0.08] text-[11px] text-[#8E8E93] font-bold text-center">일정 제목 · 시작일 · 종료일을 넣고 '추가'</div>
                ) : (
                  <div className="space-y-2.5">
                    {plan.roadmap.map((r, i) => {
                      const s = new Date(r.start).getTime();
                      const e = new Date(r.end).getTime();
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-[#1D1D1F] truncate">{r.title}</span>
                            <span className="text-[9px] text-[#8E8E93] shrink-0 ml-2">{r.start} ~ {r.end}</span>
                          </div>
                          <div className="relative h-2.5 bg-black/[0.05] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(((e - s) / span) * 100, 3)}%` }}
                              transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                              className="absolute top-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                              style={{ left: `${((s - min) / span) * 100}%` }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
              {plan.roles.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">역할 및 담당</p>
                  <div className="space-y-1.5">
                    {plan.roles.map((r) => (
                      <div key={r.name} className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-lg">
                        <Avatar name={r.name} size="w-6 h-6" />
                        <span className="text-[11px] font-bold text-[#1D1D1F] w-14 shrink-0">{r.name}</span>
                        <span className="text-[11px] text-[#3A3A3C] bg-[#fff] px-2 py-1 rounded-md border border-black/[0.06]">{r.role}</span>
                        <span className="text-[11px] text-[#6E6E73] truncate">{r.duties}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-3 bg-[#fff] border border-black/[0.06] text-[#6E6E73] rounded-xl font-bold text-xs">닫기</button>
              <button
                onClick={() => canSubmit && setSubmitted(true)}
                disabled={!canSubmit}
                className={`relative flex-[2] py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${canSubmit ? "bg-[#4F46E5] text-white" : "bg-black/[0.05] text-[#8E8E93] cursor-not-allowed"}`}
              >
                <Pin n={4} className="-top-2 -right-2" />
                <Send size={13} /> {submitted ? "제출 완료! (다시 확정 가능)" : "제출 확정"}
              </button>
            </div>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "파일로 올리기 (선택)", body: <>'양식 내려받기'로 받은 Word 양식에 내용을 채워서 올려요. 한글에서 열어 <b>.hwp로 저장</b>하거나 <b>PDF로 내보내도</b> 똑같이 읽혀요. 올린 원본은 그대로 첨부돼서 언제든 다운로드·미리보기(PDF)할 수 있어요.</> },
                { title: "자동으로 채워진 내용 확인", body: "파일에서 읽은 항목이 아래 칸에 채워져요. 이미 적어둔 내용이 있으면 덮어쓸지 먼저 물어봐요. 못 읽은 항목은 노란 안내로 알려줘요." },
                { title: "로드맵 다듬기", body: "일정마다 제목·시작일·종료일이 있어야 해요. 날짜가 비었거나 종료일이 더 빠르면 노란 테두리가 생기고 제출이 막혀요." },
                { title: "제출 확정", body: "필수 항목이 다 차면 버튼이 켜져요. 쓰는 동안은 자동 저장되니 중간에 나가도 괜찮아요." },
              ]}
            />
            <div className="bg-[#fff] rounded-2xl border border-black/[0.06] overflow-hidden">
              <div className="px-4 py-3 border-b border-black/[0.06] flex items-center gap-2"><FileText size={14} className="text-[#0071E3]" /><p className="text-sm font-bold text-[#1D1D1F]">계획서 필수 항목</p></div>
              <div className="divide-y divide-black/[0.04] text-xs">
                {[
                  ["■ 프로젝트 명", "필수 (개인만)", "팀은 팀 탭의 프로젝트명을 써요"],
                  ["■ 배경 및 목표 개요", "필수", "자유롭게"],
                  ["■ 핵심 목표", "필수", "최소 2개 · 최대 10개"],
                  ["■ 로드맵", "필수", "1개 이상 · 제목/시작일/종료일"],
                  ["■ 역할 및 담당", "선택", "이름 · 역할 · 담당 업무"],
                  ["■ 관련 링크", "선택", "이름 · 주소"],
                  ["■ 기타 참고사항", "선택", ""],
                ].map(([a, b, c]) => (
                  <div key={a} className="grid grid-cols-[1.3fr_0.8fr_1.4fr] gap-2 px-4 py-2.5 items-center">
                    <span className="font-bold text-[#1D1D1F]">{a}</span>
                    <span className={`font-bold ${b.startsWith("필수") ? "text-[#0071E3]" : "text-[#8E8E93]"}`}>{b}</span>
                    <span className="text-[#6E6E73]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <Note tone="warn">파일의 <b>■ 항목 제목은 지우거나 바꾸지 마세요.</b> 제목을 기준으로 내용을 나눠 읽어서, 제목이 없으면 파일만 첨부되고 칸은 비어 있어요. 날짜는 <b>2026-09-01</b>처럼 적어주세요.</Note>
            <Note>팀 계획서도 같은 화면이에요. <b>팀 프로젝트 › 팀 공유 자료 › 3월/9월</b>을 누르면 열리고, 역할 칸에는 팀원이 미리 채워져요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 3. 커뮤니티
// ---------------------------------------------------------------------------

const DEMO_MEMBERS = [
  { name: "김데브", year: "23", project: "스마트홈 IoT 프로젝트" },
  { name: "이자인", year: "23", project: "동아리 웹 리뉴얼" },
  { name: "박코드", year: "24", project: "알고리즘 스터디 봇" },
];

const CommunitySection = () => {
  const [view, setView] = useState<"list" | "detail">("list");
  const [project, setProject] = useState<"personal" | "team">("personal");
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const reset = () => { setView("list"); setProject("personal"); setModal(false); setQ(""); };
  const filtered = DEMO_MEMBERS.filter((m) => !q.trim() || m.name.includes(q.trim()) || m.project.includes(q.trim()));

  const timeline = project === "personal"
    ? [{ m: 9, t: "PLAN", title: "스마트홈 IoT 프로젝트", done: true }, { m: 10, t: "PROGRESS", title: "도어락 모듈 연동 완료", done: true }, { m: 11, t: "PROGRESS", title: "", done: false }]
    : [{ m: 9, t: "PLAN", title: "팀 계획서", done: true }, { m: 10, t: "PROGRESS", title: "", done: false }];

  return (
    <Section id="guide-community" no="3" icon={<Users size={20} />} title="커뮤니티 — 부원들의 프로젝트 둘러보기" desc="모든 부원의 이번 학기 프로젝트와 제출 자료를 볼 수 있어요. 다른 사람의 발표자료를 참고하거나, 팀원을 찾을 때 좋아요.">
      <TwoCol
        demo={
          <DemoFrame label={view === "list" ? "총회 › 커뮤니티" : "총회 › 커뮤니티 › 김데브"} onReset={reset} hint={view === "list" ? "김데브 카드를 눌러보세요" : "개인/팀을 바꾸고 9월을 눌러보세요"} minH="min-h-[520px]">
            <AnimatePresence mode="wait">
              {view === "list" ? (
                <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                    <div>
                      <p className="text-2xl font-bold text-[#1D1D1F] tracking-tighter uppercase">커뮤니티</p>
                      <p className="text-[#8E8E93] font-bold text-[11px]">DEVSIGN 부원들의 실시간 프로젝트 현황입니다.</p>
                    </div>
                    <div className="relative sm:w-56">
                      <Pin n={1} className="-top-2 -left-2" />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C7C7CC]" size={14} />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="부원 또는 프로젝트 검색" className="w-full pl-8 pr-3 py-2.5 bg-[#fff] border border-black/[0.08] rounded-xl outline-none font-bold text-xs" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="text-[#0071E3] w-5 h-5" />
                    <p className="text-lg font-bold text-[#0071E3]">재학 중인 부원 <span className="text-sm opacity-70">({filtered.length})</span></p>
                  </div>
                  {["23", "24"].map((year) => {
                    const list = filtered.filter((m) => m.year === year);
                    if (list.length === 0) return null;
                    return (
                      <div key={year} className="mb-5">
                        <div className="flex items-center gap-3 mb-3"><span className="text-xs font-bold text-[#8E8E93]">{year}학번</span><div className="h-px bg-black/[0.05] flex-1" /></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {list.map((m) => (
                            <motion.div
                              key={m.name}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => m.name === "김데브" && setView("detail")}
                              className={`relative bg-[#fff] p-3.5 rounded-2xl border border-black/[0.06] shadow-sm flex items-center gap-3 transition-all ${m.name === "김데브" ? "cursor-pointer hover:border-[#0071E3]/30 hover:shadow-xl ring-2 ring-pink-200" : "opacity-70"}`}
                            >
                              {m.name === "김데브" && <Pin n={2} className="-top-2 -right-2" />}
                              <Avatar name={m.name} size="w-11 h-11" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-sm font-bold text-[#1D1D1F]">{m.name}</span>
                                  <span className="text-[8px] font-bold text-[#0071E3] bg-[#EEF2FF] px-1.5 py-0.5 rounded-md border border-[#0071E3]/20/50">{m.year}학번</span>
                                </div>
                                <p className="text-[11px] font-bold text-[#8E8E93] truncate">{m.project}</p>
                              </div>
                              <ChevronRight className="text-slate-200 w-4 h-4 shrink-0" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <div className="flex items-center justify-between gap-2 mb-5">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setView("list")} className="p-2.5 bg-[#fff] border border-black/[0.06] rounded-xl text-[#8E8E93] hover:text-[#0071E3] shrink-0"><ArrowLeft size={16} /></button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xl font-bold text-[#1D1D1F] truncate">김데브</p>
                          <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#0071E3] text-[8px] font-bold rounded-md border border-[#0071E3]/20/50">23학번</span>
                        </div>
                        <p className="text-[#8E8E93] font-bold flex items-center gap-1 text-[11px] truncate"><ExternalLink size={11} className="text-[#0071E3]/70" /> {project === "personal" ? "스마트홈 IoT 프로젝트" : "캠퍼스 길찾기 앱"}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 bg-[#fff] px-3 py-2 rounded-xl border border-black/[0.06] text-[11px] font-bold text-[#1D1D1F] shrink-0"><CalendarDays size={13} className="text-[#0071E3]" /> 2026년도 2학기 <ChevronDown size={12} className="text-[#8E8E93]" /></span>
                  </div>
                  {project === "personal" && (
                    <div className="bg-[#fff] p-3.5 rounded-2xl border border-black/[0.06] mb-4">
                      <p className="flex items-center gap-1.5 text-[#0071E3] text-[10px] font-bold uppercase tracking-wide mb-2"><Link2 size={12} /> 관련 링크</p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] rounded-full border border-black/[0.06] text-xs font-bold text-[#1D1D1F]">Git <ExternalLink size={11} className="text-[#C7C7CC]" /></span>
                    </div>
                  )}
                  <div className="relative flex items-center gap-2 mb-4">
                    <Pin n={3} className="-top-2 -left-2" />
                    <button onClick={() => setProject("personal")} className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all ${project === "personal" ? "bg-[#4F46E5] text-white border-[#0071E3]" : "bg-[#fff] text-[#6E6E73] border-black/[0.06]"}`}><UserCircle size={12} className="inline mr-1 -mt-0.5" />개인 프로젝트</button>
                    <button onClick={() => setProject("team")} className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all ${project === "team" ? "bg-[#4F46E5] text-white border-[#0071E3]" : "bg-[#fff] text-[#6E6E73] border-black/[0.06]"}`}><Layers size={12} className="inline mr-1 -mt-0.5" />길찾기팀</button>
                  </div>
                  {project === "team" && (
                    <div className="bg-[#fff] p-3.5 rounded-2xl border border-black/[0.06] mb-4">
                      <div className="flex items-center gap-2 mb-0.5"><p className="font-bold text-[#1D1D1F] text-sm">길찾기팀</p><span className="px-1.5 py-0.5 rounded-md bg-[#EEF2FF] text-[#0071E3] text-[9px] font-bold">팀원 2명</span></div>
                      <p className="text-[#8E8E93] font-bold text-[11px] mb-2.5">캠퍼스 길찾기 앱</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[{ n: "김데브", leader: true }, { n: "박코드", leader: false }].map((m) => (
                          <div key={m.n} className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border ${m.leader ? "bg-amber-50 border-amber-200" : "bg-[#F8FAFC] border-black/[0.06]"}`}>
                            <Avatar name={m.n} size="w-6 h-6" />
                            <span className="flex flex-col leading-tight">
                              <span className="text-[10px] font-bold text-[#1D1D1F] flex items-center gap-0.5">{m.n}{m.leader && <Crown size={10} className="text-amber-500" />}</span>
                              <span className={`text-[8px] font-bold ${m.leader ? "text-amber-600" : "text-[#8E8E93]"}`}>{m.leader ? "팀장" : "팀원"}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm font-bold text-[#1D1D1F] uppercase tracking-wider mb-3">{project === "personal" ? "개인 프로젝트 타임라인" : "길찾기팀 타임라인"}</p>
                  <div className="space-y-2">
                    {timeline.map((it) => (
                      <motion.div
                        key={it.m}
                        whileHover={it.done ? { scale: 1.01 } : {}}
                        onClick={() => it.done && it.m === 9 && setModal(true)}
                        className={`relative bg-[#fff] p-3 rounded-2xl border border-black/[0.06] flex items-center justify-between ${it.done ? (it.m === 9 ? "cursor-pointer hover:shadow-lg ring-2 ring-pink-200" : "") : "opacity-40"}`}
                      >
                        {it.m === 9 && <Pin n={4} className="-top-2 -right-2" />}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-lg font-bold shrink-0 ${it.done ? "text-[#0071E3]" : "text-[#8E8E93]"}`}>{it.m}월</span>
                          <div className="h-7 w-px bg-slate-200 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-[#8E8E93]">{reportKind(it.m)}</span>
                              <span className="font-bold text-[#1D1D1F] text-xs truncate">{it.done ? it.title : `${reportKind(it.m)} 미제출`}</span>
                            </div>
                            <p className="text-[9px] text-[#8E8E93] font-bold flex items-center gap-1 mt-0.5">{it.done ? <><Check size={10} className="text-[#0071E3]" /> 2026.{String(it.m).padStart(2, "0")}.12 제출됨</> : <><Clock size={10} /> 기록이 없습니다</>}</p>
                          </div>
                        </div>
                        {it.done && <span className="p-2 bg-[#F8FAFC] text-[#C7C7CC] rounded-xl shrink-0"><Download size={14} /></span>}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <DemoModal open={modal} onClose={() => setModal(false)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#0071E3] text-[8px] font-bold rounded-md border border-[#0071E3]/20">김데브 부원 · 9월 자료</span>
                  <p className="text-lg font-bold text-[#1D1D1F] tracking-tighter mt-1">{project === "personal" ? "스마트홈 IoT 프로젝트" : "팀 계획서"}</p>
                </div>
                <button onClick={() => setModal(false)} className="p-2 bg-[#F8FAFC] text-[#8E8E93] rounded-xl"><X size={15} /></button>
              </div>
              <p className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide"><MessageCircle size={12} className="text-[#0071E3]" /> 활동 요약 내용</p>
              <div className="p-3 bg-[#F8FAFC] rounded-xl font-bold text-[#1D1D1F] text-xs mb-4">라즈베리파이 기반 스마트홈 시스템 계획서입니다.</div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2">첨부 파일</p>
              <div className="space-y-2">
                {[
                  { l: "발표자료 (PPT)", has: false, preview: false },
                  { l: "PDF 보고서", has: false, preview: false },
                  { l: "계획서 원본 파일", has: true, preview: true },
                ].map((f) => (
                  <div key={f.l} className={`flex items-center justify-between p-3 rounded-xl border ${f.has ? "bg-[#fff] border-black/[0.06]" : "bg-[#F8FAFC] border-transparent opacity-30"}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${f.has ? "bg-[#EEF2FF] text-[#0071E3]" : "bg-black/[0.05] text-[#C7C7CC]"}`}><FileText size={14} /></span>
                      <span>
                        <span className="block text-xs font-bold text-[#1D1D1F]">{f.l}</span>
                        <span className="block text-[9px] font-bold text-[#8E8E93]">{f.has ? "확인 및 다운로드" : "첨부 파일 없음"}</span>
                      </span>
                    </div>
                    {f.has && (
                      <span className="flex items-center gap-1.5">
                        {f.preview && <span className="p-2 bg-[#EEF2FF] text-[#0071E3] rounded-lg flex items-center gap-1 text-[10px] font-bold"><Eye size={12} /> 미리보기</span>}
                        <span className="p-2 bg-[#F8FAFC] text-[#8E8E93] rounded-lg"><Download size={13} /></span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </DemoModal>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "검색하기", body: "이름이나 프로젝트명으로 부원을 찾을 수 있어요. 부원은 상태(신입생·재학·휴학·졸업 등)와 학번별로 묶여 있어요." },
                { title: "부원 카드 누르기", body: "그 부원의 페이지가 열려요. 오른쪽 위에서 학기를 바꿔 지난 학기 기록도 볼 수 있어요." },
                { title: "개인 / 팀 프로젝트 고르기", body: "부원이 속한 팀이 버튼으로 나란히 떠요. 팀을 고르면 팀원(👑 팀장 표시)과 그 팀의 한 학기 타임라인으로 바뀌어요." },
                { title: "제출된 달 누르기", body: "활동 요약과 첨부 파일이 뜨고, 파일을 내려받거나 PDF는 바로 미리볼 수 있어요. 제출 안 된 달은 흐리게 보여요." },
              ]}
            />
            <Note>커뮤니티에는 <b>제출을 마친 자료</b>만 보여요. 임시 저장 중인 계획서나 제출 전 파일은 다른 사람에게 보이지 않아요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 4. 팀 프로젝트
// ---------------------------------------------------------------------------

type DemoTeamMember = { name: string; leader?: boolean; status: "ACCEPTED" | "PENDING" };

const TeamSection = () => {
  const [stage, setStage] = useState<"empty" | "form" | "team">("empty");
  const [teamName, setTeamName] = useState("길찾기팀");
  const [projectTitle, setProjectTitle] = useState("캠퍼스 길찾기 앱");
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<DemoTeamMember[]>([{ name: "김데브", leader: true, status: "ACCEPTED" }]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitation, setInvitation] = useState<"pending" | "accepted" | "declined">("pending");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setStage("empty");
    setTeamName("길찾기팀");
    setProjectTitle("캠퍼스 길찾기 앱");
    setCreating(false);
    setMembers([{ name: "김데브", leader: true, status: "ACCEPTED" }]);
    setInviteOpen(false);
    setInvitation("pending");
  };
  const create = () => {
    if (!teamName.trim() || !projectTitle.trim() || creating) return;
    setCreating(true);
    timers.current.push(setTimeout(() => { setCreating(false); setStage("team"); }, 700));
  };
  const invite = (name: string) => {
    if (members.some((m) => m.name === name)) return;
    setMembers((p) => [...p, { name, status: "PENDING" }]);
  };

  return (
    <Section id="guide-team" no="4" icon={<Layers size={20} />} title="팀 프로젝트 — 팀 만들고 함께 제출하기" desc="팀을 만들고 팀원을 초대하면, 팀 공유 자료와 팀 계획서를 팀원 누구나 올리고 고칠 수 있어요. 개인 제출과는 완전히 따로라 둘 다 할 수 있어요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 팀 프로젝트" onReset={reset} hint={stage === "team" ? "'팀원 초대'를 눌러보세요" : "'새 팀 만들기'를 눌러보세요"} minH="min-h-[560px]">
            {stage !== "team" ? (
              <div className="bg-[#fff] rounded-2xl border border-dashed border-black/[0.08] p-6 md:p-10 text-center">
                <Layers size={34} className="mx-auto text-slate-200 mb-3" />
                <p className="text-[#6E6E73] font-bold mb-5 text-xs md:text-sm leading-relaxed">아직 소속된 팀이 없습니다.<br />팀을 만들어 팀원들과 총회자료를 함께 제출해보세요.</p>
                {stage === "empty" ? (
                  <button onClick={() => setStage("form")} className="relative inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#4F46E5] text-white font-bold text-xs">
                    <Pin n={1} className="-top-2 -right-2" />
                    <PlusCircle size={16} /> 새 팀 만들기
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-xs mx-auto space-y-2">
                    <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="팀 이름" className="w-full px-3.5 py-3 bg-[#F8FAFC] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-xs" />
                    <input value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="프로젝트 명" className="w-full px-3.5 py-3 bg-[#F8FAFC] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-xs" />
                    <button onClick={create} disabled={creating} className="w-full px-4 py-3 rounded-xl bg-[#4F46E5] text-white font-bold text-xs disabled:opacity-60">{creating ? "생성 중..." : "팀 생성"}</button>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                  <span className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#4F46E5] text-white border border-[#0071E3] whitespace-nowrap">{teamName}<Crown size={10} className="inline ml-1 -mt-0.5" /></span>
                  <span className="px-3.5 py-2 rounded-xl font-bold text-xs bg-[#fff] text-[#0071E3] border border-[#0071E3]/20 whitespace-nowrap"><PlusCircle size={12} className="inline mr-1 -mt-0.5" />새 팀</span>
                </div>
                <div className="bg-[#fff] rounded-2xl p-4 md:p-6 border border-black/[0.06] shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div className="relative min-w-0 space-y-2.5">
                      <Pin n={2} className="-top-2 -left-3" />
                      <div>
                        <span className="text-[9px] font-bold text-[#0071E3] uppercase tracking-wide">Team Name</span>
                        <div className="flex items-center gap-1.5"><p className="text-lg md:text-xl font-bold text-[#1D1D1F] truncate">{teamName}</p><Edit2 size={13} className="text-[#C7C7CC] shrink-0" /></div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide">Project Title</span>
                        <div className="flex items-center gap-1.5"><p className="text-xs md:text-sm font-bold text-[#6E6E73] truncate">{projectTitle}</p><Edit2 size={11} className="text-[#C7C7CC] shrink-0" /></div>
                      </div>
                    </div>
                    <span className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FDF2F8] text-[#FF3B30] font-bold text-[11px]"><Trash2 size={12} /> 팀 해체</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">팀원 ({members.length})</p>
                    <button onClick={() => setInviteOpen(true)} className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EEF2FF] text-[#0071E3] font-bold text-[11px] hover:bg-[#E0E7FF]">
                      <Pin n={3} className="-top-2 -right-2" />
                      <UserPlus size={13} /> 팀원 초대
                    </button>
                  </div>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <motion.div layout key={m.name} className="flex items-center justify-between gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-black/[0.06]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={m.name} size="w-8 h-8" />
                          <span className="font-bold text-[#1D1D1F] text-xs truncate">23 {m.name}</span>
                          {m.leader && <Crown size={12} className="text-amber-500 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${m.status === "ACCEPTED" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"}`}>{m.status === "ACCEPTED" ? "수락됨" : "대기중"}</span>
                          {m.status === "PENDING" && (
                            <button onClick={() => setMembers((p) => p.map((x) => (x.name === m.name ? { ...x, status: "ACCEPTED" } : x)))} className="text-[9px] font-bold text-[#0071E3] underline underline-offset-2">(체험) 수락시키기</button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <p className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2 mt-5 mb-3"><FileText size={14} className="text-[#0071E3]" /> 팀 공유 자료</p>
                <div className="relative space-y-2">
                  <Pin n={4} className="-top-2 -left-2" />
                  <MonthCardView team card={{ month: 9, type: "PLAN", state: "done", title: "9월 팀 자료", date: "2026.09.12" }} />
                  <MonthCardView team card={{ month: 10, type: "PROGRESS", state: "open" }} />
                </div>
              </motion.div>
            )}

            <DemoModal open={inviteOpen} onClose={() => setInviteOpen(false)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold text-[#1D1D1F]">팀원 초대</p>
                <button onClick={() => setInviteOpen(false)} className="p-2 bg-[#F8FAFC] text-[#8E8E93] rounded-xl"><X size={15} /></button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C7C7CC]" size={14} />
                <input placeholder="이름 또는 학번 검색" className="w-full pl-9 pr-3 py-2.5 bg-[#F8FAFC] rounded-xl outline-none font-bold text-xs" />
              </div>
              <div className="space-y-1">
                {[{ n: "이자인", s: "23" }, { n: "박코드", s: "24" }, { n: "최서버", s: "25" }].map((m) => {
                  const invited = members.some((x) => x.name === m.n);
                  return (
                    <div key={m.n} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC]">
                      <div className="flex items-center gap-2.5"><Avatar name={m.n} size="w-8 h-8" /><span><span className="block font-bold text-[#1D1D1F] text-xs">{m.n}</span><span className="block text-[9px] text-[#8E8E93] font-bold">20{m.s}학번</span></span></div>
                      <button onClick={() => invite(m.n)} disabled={invited} className={`px-3 py-1.5 rounded-lg font-bold text-[11px] ${invited ? "bg-black/[0.05] text-[#8E8E93]" : "bg-[#4F46E5] text-white"}`}>{invited ? "초대함" : "초대"}</button>
                    </div>
                  );
                })}
              </div>
            </DemoModal>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "새 팀 만들기", body: "팀 이름과 프로젝트 명을 넣고 '팀 생성'을 누르면 내가 팀장(👑)이 돼요. 한 학기에 여러 팀에 속할 수 있어서, 팀이 있어도 위쪽 '새 팀'으로 더 만들 수 있어요." },
                { title: "팀 정보 고치기 (팀장)", body: "연필 아이콘으로 팀 이름·프로젝트 명을 바꿀 수 있어요. 팀장은 '팀 해체', 팀원은 '팀 나가기' 버튼이 보여요." },
                { title: "팀원 초대 (팀장)", body: "이름이나 학번으로 찾아 '초대'를 누르면 상대 화면에 초대가 가요. 수락 전까지 '대기중'으로 보이고, 팀장은 X로 내보낼 수도 있어요." },
                { title: "팀 공유 자료 제출", body: "마이 페이지와 같은 방식이에요. 팀원 누구나 올리거나 고칠 수 있고, 마지막으로 고친 사람이 카드에 표시돼요. 3월·9월은 팀 계획서 페이지가 열려요." },
              ]}
            />
            <div>
              <p className="text-xs font-bold text-[#6E6E73] mb-2 ml-1">초대를 받으면 팀 프로젝트 탭 맨 위에 이렇게 떠요</p>
              <div className="bg-[#fff] p-4 rounded-2xl border border-[#0071E3]/20 shadow-sm">
                <p className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5 mb-2.5"><Mail size={13} className="text-[#0071E3]" /> 받은 팀 초대</p>
                <AnimatePresence mode="wait">
                  {invitation === "pending" ? (
                    <motion.div key="p" exit={{ opacity: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-[#1D1D1F] text-sm">알고리즘팀</p>
                        <p className="text-[11px] text-[#8E8E93] font-bold">프로젝트: 알고리즘 스터디 봇</p>
                        <p className="text-[11px] text-[#8E8E93] font-bold mt-0.5">박코드 님이 팀에 초대했습니다.</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setInvitation("declined")} className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] text-[#6E6E73] font-bold text-xs">거절</button>
                        <button onClick={() => setInvitation("accepted")} className="px-3.5 py-2 rounded-xl bg-[#4F46E5] text-white font-bold text-xs shadow-md">수락</button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.p key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-xs font-bold flex items-center gap-1.5 ${invitation === "accepted" ? "text-green-600" : "text-[#8E8E93]"}`}>
                      {invitation === "accepted" ? <><CheckCircle2 size={14} /> 알고리즘팀에 합류했어요! 위쪽 팀 목록에 추가돼요.</> : <><X size={14} /> 초대를 거절했어요.</>}
                      <button onClick={() => setInvitation("pending")} className="ml-auto text-[10px] text-[#8E8E93] underline">다시</button>
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <Note>팀 탭 맨 아래 <b>다른 팀 둘러보기</b>에서 이번 학기 다른 팀을 팀명·프로젝트명·팀원 이름으로 찾아볼 수 있어요. 팀원 칩을 누르면 그 부원 페이지로 이동해요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 5. 출석
// ---------------------------------------------------------------------------

const DEMO_CODE = "427";

const AttendanceSection = () => {
  const [digits, setDigits] = useState(["", "", ""]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const reset = () => { setDigits(["", "", ""]); setDone(false); setError(""); };

  const change = (i: number, raw: string) => {
    const v = raw.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v && i < 2) refs[i + 1].current?.focus();
    if (v && i === 2 && next.every((d) => d)) {
      if (next.join("") === DEMO_CODE) {
        setDone(true);
      } else {
        setError("인증번호가 올바르지 않습니다");
        setShake(true);
        setTimeout(() => setShake(false), 450);
        setDigits(["", "", ""]);
        refs[0].current?.focus();
      }
    }
  };

  return (
    <Section id="guide-attendance" no="5" icon={<CheckSquare size={20} />} title="출석 — 인증번호 3자리 입력" desc="총회가 시작되면 운영진이 화면에 3자리 숫자를 띄워요. 출석 탭에서 그 숫자를 입력하면 바로 출석 처리돼요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 출석" onReset={reset} hint={`화면의 번호 ${DEMO_CODE}를 입력해보세요`} minH="min-h-[380px]">
            <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1.1fr] gap-4 items-center">
              <div className="rounded-2xl bg-slate-900 text-white p-5 text-center shadow-xl">
                <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.2em] mb-2">총회장 화면</p>
                <p className="text-5xl font-bold tracking-[0.25em] tabular-nums">{DEMO_CODE}</p>
                <p className="text-[10px] text-[#8E8E93] mt-3">남은 시간 04:32</p>
              </div>
              <div className="bg-[#fff] rounded-[24px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] px-5 py-8 text-center">
                {done ? (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white mx-auto mb-4 bg-[#34C759]"><CheckCircle2 size={24} /></div>
                    <p className="text-lg font-semibold text-[#1D1D1F]">출석 완료</p>
                    <p className="text-xs text-[#8E8E93] mt-1">13 / 30명 출석</p>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-[#1D1D1F] mb-1">인증번호 입력</p>
                    <p className="text-xs text-[#8E8E93] mb-6">화면에 표시된 3자리 숫자를 입력하세요</p>
                    <motion.div animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-center gap-2.5 mb-3">
                      {digits.map((d, i) => (
                        <input
                          key={i}
                          ref={refs[i]}
                          value={d}
                          inputMode="numeric"
                          maxLength={1}
                          onChange={(e) => change(i, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !digits[i] && i > 0) refs[i - 1].current?.focus();
                          }}
                          className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-medium text-[#1D1D1F] bg-[#F8FAFC] border border-black/[0.08] rounded-2xl outline-none focus:bg-[#fff] focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
                        />
                      ))}
                    </motion.div>
                    <p className="h-4 text-xs font-medium text-[#FF3B30]">{error}</p>
                  </>
                )}
              </div>
            </div>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "출석 탭 열기", body: "총회가 시작되면 출석 탭에 '인증번호 입력' 칸이 떠요. 진행 중인 출석이 없으면 '현재 진행 중인 출석이 없습니다'라고 보여요." },
                { title: "숫자 3개 입력", body: "세 번째 숫자까지 넣으면 자동으로 확인해요. 틀리면 칸이 흔들리고 다시 입력할 수 있어요." },
                { title: "출석 완료 확인", body: "초록 체크와 함께 지금까지 출석한 인원이 보여요." },
              ]}
            />
            <div className="bg-[#fff] rounded-2xl border border-black/[0.06] p-4 space-y-2.5">
              <p className="text-xs font-bold text-[#6E6E73] mb-1">이런 화면이 뜰 수도 있어요</p>
              {[
                { t: "현재 진행 중인 출석이 없습니다", d: "아직 시작 전이거나 이미 끝났어요." },
                { t: "이번 출석 대상자가 아닙니다", d: "운영진이 올린 출석 명단에 없어요. 운영진에게 알려주세요." },
                { t: "출석 인증 시간이 종료되었습니다", d: "제한 시간이 지나 자동으로 닫혔어요." },
              ].map((r) => (
                <div key={r.t} className="flex gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <p className="text-xs text-[#6E6E73] font-medium"><b className="text-[#1D1D1F]">{r.t}</b> — {r.d}</p>
                </div>
              ))}
            </div>
            <Note tone="warn">출석은 <b>로그인한 본인 계정으로만</b> 처리돼요. 번호를 알아도 다른 사람 대신 출석할 수는 없어요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 6. 자주 묻는 질문
// ---------------------------------------------------------------------------

const FAQS: { q: string; a: ReactNode }[] = [
  { q: "제출 기간이 지나서 카드가 '불가'로 바뀌었어요.", a: "기간이 끝나면 그 달은 읽기 전용으로 잠겨서 제출·수정이 안 돼요. 꼭 내야 한다면 운영진에게 문의해주세요." },
  { q: "개인 프로젝트와 팀 프로젝트를 둘 다 내야 하나요?", a: "둘은 완전히 따로 관리돼요. 팀에 속해도 마이 페이지의 개인 자료는 그대로 남고, 팀 공유 자료는 팀 탭에서 따로 제출해요. 무엇을 내야 하는지는 운영진 공지를 따라주세요." },
  { q: "어떤 파일을 올릴 수 있나요?", a: <>발표자료 칸은 <b>.ppt/.pptx</b>, PDF 칸은 <b>.pdf</b>, 기타 자료 칸은 형식 제한이 없어요. 계획서 파일은 <b>PDF · Word(.docx) · 한글(.hwp/.hwpx) · PowerPoint(.pptx)</b>를 올릴 수 있어요. (.doc, .ppt 같은 예전 형식은 새 형식으로 저장해서 올려주세요.)</> },
  { q: "계획서 파일을 올렸는데 칸이 채워지지 않았어요.", a: "양식의 '■ 항목 제목'이 바뀌었거나 지워졌을 가능성이 커요. '양식 내려받기'로 받은 양식에 다시 써서 올리거나, 칸에 직접 입력해도 돼요. 파일 자체는 그대로 첨부돼 있어요." },
  { q: "계획서를 쓰다가 나가면 사라지나요?", a: "아니요. 쓰는 동안 자동으로 저장돼요(오른쪽 위 '자동 저장됨'). 다시 들어오면 그대로 이어서 쓸 수 있고, '제출 확정'을 눌러야 커뮤니티에 공개돼요." },
  { q: "팀장인데 팀원을 잘못 초대했어요.", a: "팀원 목록에서 그 사람 오른쪽 X를 누르면 초대를 취소하거나 내보낼 수 있어요." },
  { q: "파일을 끌어다 놓아도 되나요?", a: "네. 총회자료·팀 자료·계획서의 파일 칸 위로 끌어오면 파란 테두리가 생기고, 놓으면 바로 들어가요. 칸에 맞지 않는 형식이면 알려줘요." },
];

const FaqSection = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="guide-faq" no="6" icon={<MessageCircle size={20} />} title="자주 묻는 질문" desc="막히는 게 있으면 여기부터 확인해보세요. 그래도 해결되지 않으면 운영진에게 알려주세요.">
      <div className="bg-[#fff] rounded-3xl border border-black/[0.06] shadow-sm divide-y divide-black/[0.06] overflow-hidden">
        {FAQS.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 md:px-7 py-4 md:py-5 text-left hover:bg-[#F8FAFC]/60">
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="text-[#0071E3] font-bold text-sm shrink-0">Q.</span>
                <span className="text-sm md:text-[15px] font-bold text-[#1D1D1F]">{f.q}</span>
              </span>
              <ChevronDown size={16} className={`text-[#8E8E93] shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-5 md:px-7 pb-5 pl-11 md:pl-[3.25rem] text-xs md:text-sm text-[#6E6E73] font-medium leading-relaxed">{f.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 사용법 탭
// ---------------------------------------------------------------------------

export const GuideTab = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-16 w-full">
    {/* 머리말 */}
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white p-6 md:p-12 mb-12 md:mb-20">
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#fff]/10 blur-2xl" />
      <div className="absolute right-10 -bottom-24 w-72 h-72 rounded-full bg-[#F472B6]/20 blur-3xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] text-white/70 mb-3"><BookOpen size={14} /> Guide</p>
        <h1 className="text-2xl md:text-5xl font-bold tracking-tight mb-3">총회 시스템 사용법</h1>
        <p className="text-xs md:text-base text-white/80 font-medium leading-relaxed max-w-2xl">
          마이 페이지 제출부터 계획서, 커뮤니티, 팀 프로젝트, 출석까지 — 실제 화면 그대로 눌러보면서 익힐 수 있어요.
          <span className="hidden md:inline"> 체험 화면은 연습용이라 눌러도 실제로 제출되지 않아요.</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-6 md:mt-8">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollToSection(s.id)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hero-glass text-white text-[11px] md:text-xs font-bold">
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    <StartSection />
    <MyPageSection />
    <PlanSection />
    <CommunitySection />
    <TeamSection />
    <AttendanceSection />
    <FaqSection />
  </motion.div>
);
