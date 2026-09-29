import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, BookOpen, CalendarRange, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck,
  Download, FileText, Maximize, MessageCircle, MonitorPlay, Save, Send, ShieldCheck, X,
} from "lucide-react";
import { Avatar, DemoFrame, DemoModal, Note, Pin, Section, Steps, TwoCol, scrollToSection } from "./GuideTab";

// ✨ [2026-09-30] 관리자 전용 사용법 — 총회 시스템의 관리자 메뉴(제출/자료, 출석 설정, 총회 배너)를
// 부원용 사용법과 같은 형식(직접 눌러보는 체험 화면 + 번호 설명)으로 안내한다. 체험 화면은 가짜 데이터로만 동작.

const SECTIONS = [
  { id: "admin-guide-start", label: "한눈에 보기", icon: <BookOpen size={14} /> },
  { id: "admin-guide-period", label: "제출 / 자료", icon: <CalendarRange size={14} /> },
  { id: "admin-guide-attendance", label: "출석 설정", icon: <ClipboardCheck size={14} /> },
  { id: "admin-guide-banner", label: "총회 배너", icon: <MonitorPlay size={14} /> },
  { id: "admin-guide-faq", label: "자주 묻는 질문", icon: <MessageCircle size={14} /> },
];

// ---------------------------------------------------------------------------
// 0. 한눈에 보기
// ---------------------------------------------------------------------------

const StartSection = () => (
  <Section id="admin-guide-start" no="0" icon={<ShieldCheck size={20} />} title="관리자 메뉴 한눈에 보기" desc="관리자 계정에만 보이는 메뉴예요. 한 달 총회는 보통 아래 순서로 준비해요.">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
      {[
        { icon: <CalendarRange size={18} />, title: "제출 / 자료", when: "총회 1~2주 전", desc: "그 달 제출 기간을 열고, 마감 전에 미제출자에게 디스코드 알림을 보내요. 총회 전날 자료를 ZIP으로 모아 받아요.", go: "admin-guide-period" },
        { icon: <MonitorPlay size={18} />, title: "총회 배너", when: "총회 당일 전", desc: "공지·안건·다음 총회 안내를 적어두고, 총회장 화면에 전체 화면으로 띄워요.", go: "admin-guide-banner" },
        { icon: <ClipboardCheck size={18} />, title: "출석 설정", when: "총회 당일", desc: "디스코드 공지의 ✅ 반응으로 대상자를 정하고, 인증번호를 띄워 10분 동안 출석을 받아요.", go: "admin-guide-attendance" },
      ].map((c, i) => (
        <button key={c.title} onClick={() => scrollToSection(c.go)} className="text-left bg-[#fff] rounded-3xl border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-5 hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)] transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="w-9 h-9 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">{c.icon}</span>
            <span className="text-[11px] font-semibold text-[#8E8E93]">{i + 1}단계 · {c.when}</span>
          </div>
          <p className="text-base font-bold text-[#1D1D1F] mb-1">{c.title}</p>
          <p className="text-[13px] text-[#6E6E73] leading-relaxed">{c.desc}</p>
          <p className="mt-3 text-xs font-semibold text-[#0071E3] flex items-center gap-0.5">자세히 보기 <ChevronRight size={13} /></p>
        </button>
      ))}
    </div>
    <Note tone="warn">관리자 메뉴의 변경은 <b>부원 화면에 바로 반영</b>돼요. 특히 제출 기간과 출석 시작은 실제 부원들에게 영향을 주니 한 번 더 확인하고 눌러주세요.</Note>
  </Section>
);

// ---------------------------------------------------------------------------
// 1. 제출 / 자료
// ---------------------------------------------------------------------------

const DEMO_PEOPLE = [
  { name: "김데브", sid: "23", submitted: true, at: "10.13 21:04", discord: true },
  { name: "이자인", sid: "23", submitted: true, at: "10.12 18:40", discord: true },
  { name: "박코드", sid: "24", submitted: false, discord: true },
  { name: "최서버", sid: "25", submitted: false, discord: true },
  { name: "한휴학", sid: "21", submitted: false, discord: false },
];

const PeriodSection = () => {
  const [start, setStart] = useState("2026-10-01");
  const [end, setEnd] = useState("2026-10-15");
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"done" | "todo">("done");
  const [picked, setPicked] = useState<string[]>([]);
  const [fileType, setFileType] = useState("all");
  const [zipped, setZipped] = useState(false);
  const [message, setMessage] = useState("아직 10월 총회자료를 제출하지 않으셨어요! 총회 탭에서 제출 부탁드립니다 🙏");
  const [sent, setSent] = useState(false);

  const reset = () => {
    setStart("2026-10-01"); setEnd("2026-10-15"); setSaved(false); setOpen(false); setTab("done");
    setPicked([]); setFileType("all"); setZipped(false); setSent(false);
  };
  const list = DEMO_PEOPLE.filter((p) => (tab === "done" ? p.submitted : !p.submitted));
  const toggle = (n: string) => setPicked((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  const submittedCount = DEMO_PEOPLE.filter((p) => p.submitted).length;

  return (
    <Section id="admin-guide-period" no="1" icon={<CalendarRange size={20} />} title="제출 / 자료 — 기간 설정과 자료 모으기" desc="달마다 제출 기간을 정하고, 누가 냈는지 보고, 안 낸 사람에게 알림을 보내고, 낸 자료를 한 번에 내려받아요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 관리자 › 제출 / 자료" onReset={reset} hint="날짜를 바꾸고 '현황 확인'을 눌러보세요" minH="min-h-[460px]">
            <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-[#fff] rounded-2xl border border-black/[0.06]">
              <p className="flex items-center gap-1.5 text-xs text-[#6E6E73]"><AlertCircle size={14} className="text-[#0071E3]" /> 저장하면 부원 마이 페이지에 바로 반영돼요.</p>
              <button onClick={() => setSaved(true)} className="relative flex items-center gap-1 h-8 px-3 rounded-full bg-[#0071E3] text-white text-[11px] font-semibold shrink-0">
                <Pin n={3} className="-top-2 -right-2" />
                {saved ? <><Check size={12} /> 저장됨</> : <><Save size={12} /> 전체 저장</>}
              </button>
            </div>
            <div className="bg-[#fff] rounded-3xl border border-black/[0.06] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shrink-0"><FileText size={18} /></span>
                <div>
                  <p className="text-base font-bold text-[#1D1D1F]">10월 <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#0071E3]/10 text-[#0071E3]">총회자료</span></p>
                  <p className="text-[11px] text-[#8E8E93]">제출 받는 중</p>
                </div>
              </div>
              <div className="relative grid grid-cols-2 gap-2">
                <Pin n={1} className="-top-2 -left-2" />
                {[["시작일", start, setStart], ["마감일", end, setEnd]].map(([label, value, set]: any) => (
                  <label key={label} className="relative block">
                    <span className="absolute left-3 top-1.5 text-[9px] font-semibold text-[#8E8E93]">{label}</span>
                    <input type="date" value={value} onChange={(e) => { set(e.target.value); setSaved(false); }} className="w-full pt-5 pb-1.5 px-3 bg-[#F5F5F7] rounded-xl text-xs font-semibold text-[#1D1D1F] outline-none" />
                  </label>
                ))}
              </div>
              <button onClick={() => setOpen(true)} className="relative w-full text-left bg-[#F5F5F7] p-3 rounded-2xl hover:bg-black/[0.06] transition-colors ring-2 ring-[#EC4899]/30">
                <Pin n={2} className="-top-2 -right-2" />
                <div className="flex justify-between items-end mb-1.5">
                  <span className="text-[10px] font-semibold text-[#8E8E93]">현황 확인</span>
                  <span className="text-xs font-bold text-[#0071E3]">{submittedCount}/{DEMO_PEOPLE.length} 명</span>
                </div>
                <div className="h-1.5 bg-black/[0.08] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0071E3] rounded-full" style={{ width: `${(submittedCount / DEMO_PEOPLE.length) * 100}%` }} />
                </div>
              </button>
            </div>

            <DemoModal open={open} onClose={() => setOpen(false)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold text-[#1D1D1F]">10월 제출 현황</p>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center"><X size={15} /></button>
              </div>
              <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-xl mb-3">
                {([["done", `제출 ${submittedCount}`], ["todo", `미제출 ${DEMO_PEOPLE.length - submittedCount}`]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setTab(k); setPicked([]); setZipped(false); setSent(false); }} className={`flex-1 h-8 rounded-lg text-xs font-semibold ${tab === k ? "bg-[#fff] text-[#1D1D1F] shadow-sm" : "text-[#8E8E93]"}`}>{l}</button>
                ))}
              </div>
              <div className="space-y-1 mb-3 max-h-[150px] overflow-y-auto">
                {list.map((p) => (
                  <button key={p.name} onClick={() => toggle(p.name)} className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F5F5F7] text-left">
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${picked.includes(p.name) ? "bg-[#0071E3] border-[#0071E3] text-white" : "border-black/20"}`}>{picked.includes(p.name) && <Check size={11} />}</span>
                    <Avatar name={p.name} size="w-7 h-7" />
                    <span className="text-xs font-semibold text-[#1D1D1F] flex-1">{p.sid} {p.name}</span>
                    {p.submitted ? <span className="text-[10px] text-[#8E8E93]">{p.at}</span> : !p.discord && <span className="text-[10px] font-semibold text-[#FF9500]">디스코드 미연동</span>}
                  </button>
                ))}
              </div>
              {tab === "done" ? (
                <div className="relative flex gap-2">
                  <Pin n={4} className="-top-2 -left-2" />
                  <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F5F7] text-xs font-semibold text-[#1D1D1F] outline-none">
                    <option value="all">전체 파일</option><option value="ppt">발표자료만</option><option value="pdf">PDF만</option>
                  </select>
                  <button onClick={() => picked.length && setZipped(true)} className={`flex-1 h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${picked.length ? "bg-[#0071E3] text-white" : "bg-black/[0.05] text-[#AEAEB2]"}`}>
                    {zipped ? <><CheckCircle2 size={14} /> 10월_제출자료.zip 받음</> : <><Download size={14} /> 선택 {picked.length}명 ZIP 다운로드</>}
                  </button>
                </div>
              ) : (
                <div className="relative space-y-2">
                  <Pin n={5} className="-top-2 -left-2" />
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full p-2.5 rounded-xl bg-[#F5F5F7] text-xs text-[#1D1D1F] outline-none resize-none min-h-[56px]" />
                  <button onClick={() => picked.length && setSent(true)} className={`w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${picked.length ? "bg-[#5865F2] text-white" : "bg-black/[0.05] text-[#AEAEB2]"}`}>
                    {sent ? <><CheckCircle2 size={14} /> {picked.length}명에게 디스코드 DM 보냄</> : <><Send size={13} /> 선택 {picked.length}명에게 디스코드 알림</>}
                  </button>
                </div>
              )}
            </DemoModal>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "제출 기간 정하기", body: "달마다 시작일·마감일을 고르세요. 이 기간 안에만 부원이 제출·수정할 수 있고, 지나면 자동으로 잠겨요." },
                { title: "현황 확인", body: "몇 명이 냈는지 막대로 보이고, 누르면 제출·미제출 명단이 열려요. 최신순·학번순으로 정렬할 수 있어요." },
                { title: "전체 저장", body: <>기간을 바꾼 뒤 <b>꼭 '전체 저장'</b>을 눌러야 반영돼요. 그 연도의 모든 달이 한 번에 저장돼요.</> },
                { title: "자료 ZIP 다운로드", body: "제출 탭에서 사람을 골라 전체·발표자료만·PDF만으로 한 번에 내려받아요. 팀 공유 자료, 웹으로 쓴 계획서(PDF로 자동 변환), 계획서 원본 파일도 함께 들어가요." },
                { title: "미제출자에게 알림", body: "미제출 탭에서 사람을 골라 메시지를 적고 보내면 디스코드 DM으로 가요. '디스코드 미연동' 표시가 있는 사람은 받지 못해요." },
              ]}
            />
            <Note><b>미제출 명단과 알림 대상은 재학생·신입생</b>만 보여요(휴학생 등은 빠져요). 카드의 "n/m 명"에서 m은 탈퇴하지 않은 전체 회원 수예요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 2. 출석 설정
// ---------------------------------------------------------------------------

const ATT_PEOPLE = ["김데브", "이자인", "박코드", "최서버", "정회장"];

const AttendanceSection = () => {
  const [stage, setStage] = useState<"idle" | "running" | "closed">("idle");
  const [msgId, setMsgId] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [left, setLeft] = useState(600);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    autoRef.current.forEach(clearTimeout);
    autoRef.current = [];
  };
  useEffect(() => clear, []);
  const reset = () => { clear(); setStage("idle"); setMsgId(""); setChecked([]); setLeft(600); };
  const start = () => {
    if (!msgId.trim()) return;
    clear();
    setStage("running");
    setChecked([]);
    setLeft(600);
    timer.current = setInterval(() => setLeft((l) => Math.max(0, l - 7)), 1000);
    ["김데브", "이자인", "최서버"].forEach((n, i) => autoRef.current.push(setTimeout(() => setChecked((c) => (c.includes(n) ? c : [...c, n])), 1200 + i * 1500)));
  };
  const toggle = (n: string) => setChecked((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Section id="admin-guide-attendance" no="2" icon={<ClipboardCheck size={20} />} title="출석 설정 — 디스코드 ✅로 대상 정하고 인증번호로 받기" desc="디스코드 공지에 ✅ 반응을 누른 부원이 출석 대상이 돼요. 출석을 시작하면 3자리 인증번호가 10분 동안 열려요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 관리자 › 출석 설정" onReset={reset} hint={stage === "idle" ? "메시지 ID를 넣고 '출석 시작'" : "명단을 눌러 수기로 정정해보세요"} minH="min-h-[480px]">
            <div className="rounded-2xl bg-[#313338] p-3.5 mb-4 text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-full bg-[#5865F2] text-white text-[11px] font-bold flex items-center justify-center">D</span>
                <span className="text-[13px] font-semibold text-white">DEVSIGN 운영진</span>
                <span className="text-[10px] text-[#949BA4]">오늘 오후 6:02</span>
              </div>
              <p className="text-[12px] text-[#DBDEE1] mb-2">📢 오늘 10월 총회 참석하시는 분은 ✅ 눌러주세요!</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#5865F2]/25 border border-[#5865F2]/60 text-[12px] text-white">✅ 5</span>
              <p className="relative mt-2 text-[10px] text-[#949BA4]">
                <Pin n={1} className="-top-1 -left-2" />
                <span className="ml-4">메시지 우클릭 → <b className="text-white">메시지 ID 복사하기</b> (개발자 모드 필요)</span>
              </p>
            </div>

            {stage === "idle" ? (
              <div className="relative bg-[#fff] rounded-2xl border border-black/[0.06] p-4">
                <Pin n={2} className="-top-2 -right-2" />
                <p className="text-sm font-semibold text-[#1D1D1F] mb-2">디스코드 메시지로 출석 시작</p>
                <div className="flex gap-2">
                  <input value={msgId} onChange={(e) => setMsgId(e.target.value.replace(/[^0-9]/g, ""))} placeholder="메시지 ID 붙여넣기 (예: 1234567890123456789)" className="flex-1 min-w-0 h-10 px-3 rounded-xl bg-[#F5F5F7] text-xs text-[#1D1D1F] outline-none" />
                  <button onClick={start} className={`h-10 px-4 rounded-xl text-xs font-semibold ${msgId ? "bg-[#1D1D1F] text-white" : "bg-black/[0.05] text-[#AEAEB2]"}`}>출석 시작</button>
                </div>
                <button onClick={() => setMsgId("1290384756102938475")} className="mt-2 text-[11px] font-semibold text-[#0071E3]">예시 ID 넣기</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[0.9fr_1.1fr] gap-3">
                <div className="relative bg-[#fff] rounded-2xl border border-black/[0.06] p-4 text-center">
                  <Pin n={3} className="-top-2 -left-2" />
                  <p className="text-[11px] font-semibold text-[#8E8E93]">인증번호</p>
                  <p className="text-5xl font-semibold tracking-[0.12em] text-[#1D1D1F] tabular-nums my-2">427</p>
                  <p className={`text-xs font-semibold ${stage === "closed" ? "text-[#8E8E93]" : "text-[#0071E3]"}`}>{stage === "closed" ? "출석 종료됨" : `남은 시간 ${mm}:${ss}`}</p>
                  {stage === "running" && (
                    <button onClick={() => { clear(); setStage("closed"); }} className="mt-3 h-9 px-4 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] text-xs font-semibold">출석 종료</button>
                  )}
                </div>
                <div className="relative bg-[#fff] rounded-2xl border border-black/[0.06] p-3">
                  <Pin n={4} className="-top-2 -right-2" />
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs font-semibold text-[#1D1D1F]">실시간 출석 현황</p>
                    <p className="text-xs font-bold text-[#34C759]">{checked.length}/{ATT_PEOPLE.length}</p>
                  </div>
                  <div className="space-y-1">
                    {ATT_PEOPLE.map((n) => {
                      const on = checked.includes(n);
                      return (
                        <button key={n} onClick={() => toggle(n)} title={on ? "클릭하면 미출석으로 변경" : "클릭하면 출석으로 변경"} className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F5F5F7]">
                          <Avatar name={n} size="w-6 h-6" />
                          <span className="text-xs text-[#1D1D1F] flex-1 text-left">{n}</span>
                          <AnimatePresence mode="wait">
                            <motion.span key={String(on)} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${on ? "bg-[#34C759]/10 text-[#248A3D]" : "bg-black/[0.05] text-[#8E8E93]"}`}>
                              {on ? "출석" : "미출석"}
                            </motion.span>
                          </AnimatePresence>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "디스코드에 공지 올리기", body: <>"참석하시는 분은 ✅ 눌러주세요"처럼 공지를 올리고, 부원들이 <b>✅ 반응</b>을 누르게 해요. 그 메시지를 우클릭해 <b>메시지 ID 복사하기</b>를 눌러요. (디스코드 설정 → 고급 → 개발자 모드를 켜야 보여요)</> },
                { title: "메시지 ID로 출석 시작", body: "복사한 ID를 붙여넣고 '출석 시작'을 누르면, ✅를 누른 사람 중 웹에 가입한 부원이 출석 대상이 돼요." },
                { title: "인증번호 띄우기", body: "화면의 3자리 번호를 총회장 화면에 보여주세요. 부원은 출석 탭에서 입력해요. 10분이 지나면 자동으로 닫히고, 먼저 닫으려면 '출석 종료'를 눌러요." },
                { title: "실시간 현황·수기 정정", body: "누가 출석했는지 바로 보여요. 지각자처럼 직접 처리해야 하면 이름을 눌러 출석/미출석을 바꿀 수 있어요. 끝난 출석도 '출석 이력'에서 고치고 엑셀로 받을 수 있어요." },
              ]}
            />
            <Note tone="warn">✅를 눌렀어도 <b>웹에 가입하지 않았거나 디스코드 계정이 연결되지 않은 부원</b>은 대상에서 빠져요. 시작 결과에 빠진 사람이 표시되니 확인해주세요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 3. 총회 배너
// ---------------------------------------------------------------------------

const BannerSection = () => {
  const [month, setMonth] = useState<number | null>(null);
  const [written, setWritten] = useState<number[]>([9]);
  const [title, setTitle] = useState("10월 총회");
  const [notice, setNotice] = useState("동아리방 사용 후 정리 부탁드려요");
  const [full, setFull] = useState(false);
  const reset = () => { setMonth(null); setWritten([9]); setTitle("10월 총회"); setNotice("동아리방 사용 후 정리 부탁드려요"); setFull(false); };

  return (
    <Section id="admin-guide-banner" no="3" icon={<MonitorPlay size={20} />} title="총회 배너 — 총회장 화면 만들기" desc="달마다 제목·공지·안건·다음 총회 안내를 적어두면, 총회 당일 전체 화면으로 띄울 수 있어요.">
      <TwoCol
        demo={
          <DemoFrame label="총회 › 관리자 › 총회 배너" onReset={reset} hint="10월 카드를 눌러보세요" minH="min-h-[420px]">
            <div className="flex items-center justify-center gap-1 mb-4">
              <span className="flex items-center gap-1 bg-[#fff] border border-black/[0.06] h-9 px-1.5 rounded-full">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73]"><ChevronLeft size={15} /></span>
                <span className="text-sm font-semibold text-[#1D1D1F] w-14 text-center">2026년</span>
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73]"><ChevronRight size={15} /></span>
              </span>
            </div>
            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Pin n={1} className="-top-2 -left-2" />
              {[9, 10, 11, 12].map((m) => {
                const done = written.includes(m);
                return (
                  <button key={m} onClick={() => setMonth(m)} className={`p-3 rounded-2xl text-left bg-[#fff] border border-black/[0.06] hover:shadow-md transition-shadow ${m === 10 ? "ring-2 ring-[#EC4899]/30" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold text-[#1D1D1F]">{m}<span className="text-xs text-[#8E8E93]">월</span></span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${done ? "bg-[#34C759]/10 text-[#248A3D]" : "bg-black/[0.05] text-[#8E8E93]"}`}>{done ? "작성됨" : "미작성"}</span>
                    </div>
                    <p className={`text-xs font-semibold truncate ${done ? "text-[#1D1D1F]" : "text-[#AEAEB2]"}`}>{m === 10 && done ? title : `${m}월 총회`}</p>
                  </button>
                );
              })}
            </div>

            <DemoModal open={month !== null} onClose={() => setMonth(null)}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-lg font-bold text-[#1D1D1F]">2026년 {month}월 총회 배너</p>
                <button onClick={() => setMonth(null)} className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center"><X size={15} /></button>
              </div>
              <div className="relative space-y-2.5 mb-4">
                <Pin n={2} className="-top-2 -right-1" />
                <label className="block"><span className="text-[11px] font-semibold text-[#8E8E93]">제목</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-xl bg-[#F5F5F7] text-xs text-[#1D1D1F] outline-none" /></label>
                <label className="block"><span className="text-[11px] font-semibold text-[#8E8E93]">공지사항</span>
                  <input value={notice} onChange={(e) => setNotice(e.target.value)} className="mt-1 w-full h-9 px-3 rounded-xl bg-[#F5F5F7] text-xs text-[#1D1D1F] outline-none" /></label>
                <p className="text-[11px] text-[#8E8E93]">그 밖에: 오늘의 안건 · 참석 인원 · 종료 목표 시각 · 오늘의 한마디 · 다음 총회 날짜/안내</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFull(true)} className="relative flex-1 h-10 rounded-xl bg-black/[0.05] text-[#1D1D1F] text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Pin n={3} className="-top-2 -left-2" />
                  <Maximize size={13} /> 전체 화면 미리보기
                </button>
                <button onClick={() => { if (month) setWritten((w) => (w.includes(month) ? w : [...w, month])); setMonth(null); }} className="flex-1 h-10 rounded-xl bg-[#0071E3] text-white text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Save size={13} /> 저장
                </button>
              </div>
            </DemoModal>

            <AnimatePresence>
              {full && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFull(false)} className="absolute inset-0 z-30 bg-[#0B0B12] text-white p-6 flex flex-col justify-between cursor-pointer">
                  <div>
                    <p className="text-[11px] text-white/50 font-semibold tracking-[0.2em]">DEVSIGN</p>
                    <p className="text-3xl font-bold mt-2">{title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-[#fff]/10 border border-[#fff]/15 p-3"><p className="text-[10px] text-white/50 mb-1">공지사항</p><p className="text-sm">{notice}</p></div>
                    <div className="rounded-2xl bg-[#fff]/10 border border-[#fff]/15 p-3"><p className="text-[10px] text-white/50 mb-1">오늘의 안건</p><p className="text-sm">9월 결과 · 11월 계획</p></div>
                  </div>
                  <p className="text-[10px] text-white/40 text-center">화면을 누르면 닫혀요 (실제로는 Esc)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </DemoFrame>
        }
        side={
          <div className="space-y-5">
            <Steps
              items={[
                { title: "달 고르기", body: "위에서 연도를 고르고 총회가 있는 달 카드를 눌러요. 내용을 저장한 달은 '작성됨'으로 표시돼요." },
                { title: "내용 채우기", body: "제목, 공지사항, 오늘의 안건, 참석 인원, 종료 목표 시각, 오늘의 한마디, 다음 총회 날짜·안내를 적어요. 필요 없는 칸은 비워도 돼요." },
                { title: "전체 화면으로 발표", body: "총회 당일 전체 화면 버튼을 누르면 총회장 모니터에 꽉 차게 띄워져요. Esc로 빠져나와요." },
              ]}
            />
            <Note>배너는 달마다 따로 저장돼요. 지난달 배너를 열어 제목과 날짜만 바꿔 저장하면 빠르게 새 배너를 만들 수 있어요.</Note>
          </div>
        }
      />
    </Section>
  );
};

// ---------------------------------------------------------------------------
// 4. 자주 묻는 질문
// ---------------------------------------------------------------------------

const FAQS = [
  { q: "기간을 바꿨는데 부원 화면에 그대로예요.", a: "'전체 저장'을 눌렀는지 확인해주세요. 날짜 칸만 바꾸고 저장하지 않으면 반영되지 않아요." },
  { q: "마감이 지난 뒤에 한 명만 더 받게 하고 싶어요.", a: "그 달 마감일을 잠깐 뒤로 미루고 저장하면 다시 열려요. 받은 뒤 원래 날짜로 되돌리면 돼요. (그동안 다른 부원도 제출할 수 있어요)" },
  { q: "ZIP에 계획서가 안 보여요.", a: "'전체 파일' 또는 'PDF만'으로 받으면 웹으로 작성한 계획서가 PDF로 자동 변환돼 들어가요. 파일로 올린 계획서 원본은 '전체 파일'로 받으면 형식과 상관없이 들어가요." },
  { q: "디스코드 알림이 안 간 사람이 있어요.", a: "'디스코드 미연동' 표시가 있는 부원은 디스코드 계정이 웹에 연결되지 않아 DM을 받을 수 없어요. 개별로 연락해주세요. 서버 DM을 막아둔 경우에도 실패할 수 있어요." },
  { q: "출석 대상에서 빠진 사람이 있어요.", a: "✅를 누르지 않았거나, 웹에 가입하지 않았거나, 디스코드 계정이 연결되지 않은 경우예요. 출석을 시작할 때 빠진 사람이 함께 안내돼요." },
  { q: "출석을 잘못 시작했어요.", a: "'출석 종료'로 닫고 출석 이력에서 그 기록을 삭제한 뒤 다시 시작하면 돼요." },
];

const FaqSection = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="admin-guide-faq" no="4" icon={<MessageCircle size={20} />} title="자주 묻는 질문" desc="관리하다 막히는 부분을 모았어요.">
      <div className="bg-[#fff] rounded-3xl border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden">
        {FAQS.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-4 text-left hover:bg-[#F5F5F7]/60">
              <span className="flex items-center gap-2.5 min-w-0"><span className="text-[#0071E3] font-bold text-sm">Q.</span><span className="text-sm md:text-[15px] font-semibold text-[#1D1D1F]">{f.q}</span></span>
              <ChevronDown size={16} className={`text-[#8E8E93] shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <p className="px-5 md:px-6 pb-4 pl-11 md:pl-12 text-sm text-[#6E6E73] leading-relaxed">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </Section>
  );
};

export const AdminGuideTab = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-16 w-full">
    <div className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-[#1D1D1F] text-white p-6 md:p-12 mb-12 md:mb-20">
      <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-[#0071E3]/30 blur-3xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] md:text-xs font-semibold tracking-[0.2em] text-white/50 mb-3"><ShieldCheck size={14} /> ADMIN GUIDE</p>
        <h1 className="text-2xl md:text-5xl font-bold tracking-tight mb-3">관리자 사용법</h1>
        <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-2xl">
          제출 기간 설정부터 자료 모으기, 출석, 총회 배너까지 — 관리자 메뉴를 실제 화면 그대로 눌러보며 익혀요. 체험 화면은 연습용이라 실제로 저장·발송되지 않아요.
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
    <PeriodSection />
    <AttendanceSection />
    <BannerSection />
    <FaqSection />
  </motion.div>
);

