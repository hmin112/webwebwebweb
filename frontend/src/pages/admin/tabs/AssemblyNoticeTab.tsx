import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Megaphone, RefreshCw } from "lucide-react";
import { api } from "../../../api/axios";
import { Ring, scoreColor } from "../../profile/activity/ActivityWidgets";

// ✨ [2026-10-01 신규] 관리자 "총회 공지" — 디스코드 동아리공지 채널에서 그 달 총회 공지를 자동으로 찾아,
// 신입생·재학생 중 누가 반응(참석 투표)했는지 / 안 했는지와 반응률을 보여준다. 디스코드에서 바로 읽어 와 항상 최신.

type Person = { loginId: string; name: string; studentId: string; profileImage?: string | null; emojis: string[] };
type Group = { status: string; total: number; reacted: number; rate: number | null; people: Person[] };
type Data = {
  found: boolean;
  message?: string;
  notice?: { messageId: string; content: string; createdAt: string; channelName: string; jumpUrl: string; reactions: { emoji: string; count: number }[] };
  groups: Group[];
  total: number;
  reacted: number;
  rate: number | null;
  unmatched: string[];
};

const formatYear = (id?: string) => {
  const s = String(id || "").trim();
  return s.length === 8 ? s.substring(2, 4) : s;
};

const cleanContent = (c: string) => c.replace(/@everyone|@here|<@&?\d+>/g, "").replace(/^#+\s*/gm, "").trim();

const PersonChip = ({ p }: { p: Person }) => (
  <span className="inline-flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-full bg-[#fff] border border-black/[0.06] text-[12px]">
    <img
      src={p.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F2F2F7&color=1D1D1F`}
      onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=F2F2F7&color=1D1D1F`; }}
      className="w-6 h-6 rounded-full object-cover"
      alt=""
    />
    <span className="font-semibold text-[#1D1D1F]">{formatYear(p.studentId)} {p.name}</span>
    {p.emojis.length > 0 && <span className="text-[13px] leading-none">{p.emojis.join("")}</span>}
  </span>
);

const GroupCard = ({ g }: { g: Group }) => {
  const [view, setView] = useState<"no" | "yes">("no");
  const yes = g.people.filter((p) => p.emojis.length > 0);
  const no = g.people.filter((p) => p.emojis.length === 0);
  const list = view === "no" ? no : yes;
  return (
    <div className="glass-card rounded-[26px] p-5 md:p-6">
      <div className="flex items-center gap-4 mb-4">
        <Ring value={g.rate} color={scoreColor(g.rate)} size={64} stroke={7}>
          <span className="text-[15px] font-bold text-[#1D1D1F]">{g.rate == null ? "–" : `${g.rate}%`}</span>
        </Ring>
        <div>
          <p className="text-[17px] font-bold text-[#1D1D1F] tracking-[-0.02em]">{g.status}</p>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">{g.total}명 중 {g.reacted}명 반응</p>
        </div>
      </div>
      <div className="inline-flex p-0.5 rounded-full bg-black/[0.05] mb-3">
        {([["no", `안 누름 ${no.length}`], ["yes", `누름 ${yes.length}`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`h-8 px-3.5 rounded-full text-[13px] font-semibold transition-all ${view === k ? "bg-[#fff] text-[#1D1D1F] shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-[#6E6E73]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="text-[13px] text-[#AEAEB2] py-3">{view === "no" ? "모두 반응했어요 🎉" : "아직 아무도 반응하지 않았어요."}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {list.map((p) => <PersonChip key={p.loginId} p={p} />)}
        </div>
      )}
    </div>
  );
};

export const AssemblyNoticeTab = () => {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [data, setData] = useState<Data | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setExpanded(false);
    api.get("/admin/assembly-notice", { params: ym })
      .then((res) => { if (!cancelled) { setData(res.data); setState("ready"); } })
      .catch((e) => { if (!cancelled) { setError(e?.response?.data?.message || "디스코드에서 공지를 읽지 못했어요."); setState("error"); } });
    return () => { cancelled = true; };
  }, [ym.year, ym.month, reloadKey]);

  const shift = (delta: number) =>
    setYm((p) => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-[28px] font-bold text-[#1D1D1F] tracking-[-0.02em]">총회 공지 반응</h2>
          <p className="text-sm text-[#6E6E73] mt-1">디스코드 동아리공지에서 그 달 총회 공지를 자동으로 찾아, 신입생·재학생 중 누가 반응했는지 보여줘요.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="glass-card inline-flex items-center h-10 rounded-full px-1">
            <button onClick={() => shift(-1)} aria-label="이전 달" className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F]/70 hover:bg-black/[0.05]"><ChevronLeft size={17} /></button>
            <span className="text-sm font-semibold text-[#1D1D1F] tabular-nums px-2">{ym.year}년 {ym.month}월</span>
            <button onClick={() => shift(1)} aria-label="다음 달" className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F]/70 hover:bg-black/[0.05]"><ChevronRight size={17} /></button>
          </div>
          <button onClick={() => setReloadKey((k) => k + 1)} aria-label="새로고침" className="glass-card w-10 h-10 rounded-full flex items-center justify-center text-[#1D1D1F]/70 hover:text-[#1D1D1F]">
            <RefreshCw size={16} className={state === "loading" ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {state === "loading" && !data ? (
        <div className="glass-card rounded-[26px] py-20 flex items-center justify-center gap-2 text-sm text-[#8E8E93]">
          <Loader2 size={16} className="animate-spin" /> 디스코드에서 공지를 읽는 중이에요
        </div>
      ) : state === "error" ? (
        <div className="glass-card rounded-[26px] py-20 text-center text-sm text-[#8E8E93]">{error}</div>
      ) : data && !data.found ? (
        <div className="glass-card rounded-[26px] py-20 text-center">
          <Megaphone size={28} className="mx-auto text-[#C7C7CC] mb-3" />
          <p className="text-sm text-[#8E8E93]">{data.message}</p>
          <p className="text-xs text-[#AEAEB2] mt-1">"{ym.month}월 총회"라는 말이 들어간 공지를 찾아요.</p>
        </div>
      ) : data && data.notice ? (
        <div className={`space-y-5 transition-opacity ${state === "loading" ? "opacity-60" : ""}`}>
          {/* 공지 + 전체 반응률 */}
          <div className="glass-card rounded-[28px] p-5 md:p-7 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-[12px] font-semibold text-[#8E8E93] flex items-center gap-1.5">
                  <Megaphone size={13} /> #{data.notice.channelName} · {data.notice.createdAt.slice(0, 10)}
                </p>
                <a href={data.notice.jumpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0071E3] hover:underline shrink-0">
                  디스코드에서 보기 <ExternalLink size={11} />
                </a>
              </div>
              <p className={`text-[14px] text-[#1D1D1F] leading-relaxed whitespace-pre-line ${expanded ? "" : "line-clamp-4"}`}>{cleanContent(data.notice.content)}</p>
              <button onClick={() => setExpanded((v) => !v)} className="text-[12px] font-semibold text-[#8E8E93] hover:text-[#1D1D1F] mt-1">{expanded ? "접기" : "더 보기"}</button>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {data.notice.reactions.map((r) => (
                  <span key={r.emoji} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-black/[0.04] text-[13px] font-semibold text-[#1D1D1F]">{r.emoji} {r.count}</span>
                ))}
              </div>
            </div>
            <div className="flex md:flex-col items-center gap-3 md:gap-2 md:pl-6 md:border-l border-black/[0.06]">
              <Ring value={data.rate} color={scoreColor(data.rate)} size={104} stroke={9}>
                <span className="text-[26px] font-bold text-[#1D1D1F] tracking-[-0.03em]">{data.rate == null ? "–" : `${data.rate}%`}</span>
              </Ring>
              <div className="md:text-center">
                <p className="text-[13px] font-semibold text-[#1D1D1F]">신입생·재학생 반응률</p>
                <p className="text-xs text-[#8E8E93] mt-0.5">{data.total}명 중 {data.reacted}명</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {data.groups.map((g) => <GroupCard key={g.status} g={g} />)}
          </div>

          {data.unmatched.length > 0 && (
            <details className="glass-card rounded-[22px] px-5 py-4">
              <summary className="text-[13px] font-semibold text-[#6E6E73] cursor-pointer select-none">
                신입생·재학생 회원이 아닌 반응자 {data.unmatched.length}명 (4학년·졸업생·미가입 등)
              </summary>
              <p className="text-[13px] text-[#8E8E93] mt-2 leading-relaxed">{data.unmatched.join(", ")}</p>
            </details>
          )}
        </div>
      ) : null}
    </motion.div>
  );
};
