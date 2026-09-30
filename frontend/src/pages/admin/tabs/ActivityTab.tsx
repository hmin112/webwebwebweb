import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Loader2, Search } from "lucide-react";
import { api } from "../../../api/axios";
import { TermSelect } from "../../assembly/assemblyUi";
import { scoreColor, type MemberActivity } from "../../profile/activity/ActivityWidgets";

// ✨ [2026-09-30 신규] 관리자 "활동 현황" — 부원별 출석·총회 제출·OJ·회비와 활동 점수를 한 표에.
// 활동 점수 = 출석·총회·회비 비율 중 값이 있는 것들의 평균. 50점 미만을 "활동 적은 부원"으로 본다.

type SortKey = "score" | "attendance" | "assembly" | "fee" | "name";
const LOW_SCORE = 50;

const formatYear = (id?: string) => {
  const s = String(id || "").trim();
  return s.length === 8 ? s.substring(2, 4) : s;
};

const currentTermOptions = () => {
  const now = new Date();
  const m = now.getMonth() + 1;
  const curYear = m === 1 ? now.getFullYear() - 1 : now.getFullYear();
  const curSem = m >= 2 && m <= 7 ? 1 : 2;
  const opts: { year: number; semester: number }[] = [];
  let y = 2026, sm = 1;
  while (y < curYear || (y === curYear && sm <= curSem)) {
    opts.push({ year: y, semester: sm });
    sm++;
    if (sm > 2) { sm = 1; y++; }
  }
  return opts.reverse();
};

const RateCell = ({ rate, text, color }: { rate: number | null; text: string; color: string }) => (
  <div className="min-w-[88px]">
    <div className="flex items-baseline justify-between gap-2 mb-1">
      <span className="text-[13px] font-semibold text-[#1D1D1F]">{rate == null ? "–" : `${rate}%`}</span>
      <span className="text-[11px] text-[#8E8E93]">{text}</span>
    </div>
    <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${rate ?? 0}%`, backgroundColor: color }} />
    </div>
  </div>
);

const ScorePill = ({ score }: { score: number | null }) => (
  <span
    className="inline-flex items-center justify-center min-w-[46px] h-7 px-2.5 rounded-full text-[13px] font-bold"
    style={{ color: scoreColor(score), backgroundColor: `${scoreColor(score)}1F` }}
  >
    {score ?? "–"}
  </span>
);

export const ActivityTab = () => {
  const termOptions = useMemo(currentTermOptions, []);
  const [term, setTerm] = useState(termOptions[0]);
  const [rows, setRows] = useState<MemberActivity[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "nodata">("all");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "score", asc: true });

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    api.get("/admin/activity", { params: { year: term.year, semester: term.semester } })
      .then((res) => { if (!cancelled) { setRows(res.data || []); setState("ready"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [term]);

  const counts = useMemo(() => ({
    all: rows.length,
    low: rows.filter((r) => r.score != null && r.score < LOW_SCORE).length,
    nodata: rows.filter((r) => r.score == null).length,
  }), [rows]);

  const averages = useMemo(() => {
    const avg = (vals: (number | null)[]) => {
      const v = vals.filter((x): x is number => x != null);
      return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    return {
      score: avg(rows.map((r) => r.score)),
      attendance: avg(rows.map((r) => r.attendance.rate)),
      assembly: avg(rows.map((r) => r.assembly.rate)),
      fee: avg(rows.map((r) => r.fee.rate)),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (r: MemberActivity): number | string | null => {
      switch (sort.key) {
        case "attendance": return r.attendance.rate;
        case "assembly": return r.assembly.rate;
        case "fee": return r.fee.rate;
        case "name": return r.name;
        default: return r.score;
      }
    };
    return rows
      .filter((r) => filter === "all" || (filter === "low" ? r.score != null && r.score < LOW_SCORE : r.score == null))
      .filter((r) => !q || r.name.toLowerCase().includes(q) || String(r.studentId).includes(q) || (r.userStatus || "").includes(q))
      .sort((a, b) => {
        const va = value(a), vb = value(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1; // 값 없는 부원은 항상 아래로
        if (vb == null) return -1;
        const cmp = typeof va === "string" ? va.localeCompare(String(vb), "ko") : (va as number) - (vb as number);
        return sort.asc ? cmp : -cmp;
      });
  }, [rows, query, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, asc: !p.asc } : { key, asc: key === "name" || key === "score" }));

  const Th = ({ k, children, className = "" }: { k: SortKey; children: string; className?: string }) => (
    <th className={`px-3 py-3 text-left font-semibold ${className}`}>
      <button onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 text-xs ${sort.key === k ? "text-[#1D1D1F]" : "text-[#8E8E93]"} hover:text-[#1D1D1F]`}>
        {children}
        {sort.key === k && (sort.asc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-[28px] font-bold text-[#1D1D1F] tracking-[-0.02em]">활동 현황</h2>
          <p className="text-sm text-[#6E6E73] mt-1">
            부원별 출석·총회 제출·회비 비율이에요. 총회는 각자 마이페이지에서 정한 대표 프로젝트(팀이면 팀 공유 자료) 기준으로, 마감된 달(진행 중인 달은 이미 낸 경우만)을 세요. 활동 점수는 세 비율의 평균이고 {LOW_SCORE}점 미만이면 활동이 적은 부원으로 봐요.
          </p>
        </div>
        <TermSelect value={term} options={termOptions} onChange={setTerm} />
      </div>

      {/* 전체 평균 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "평균 활동 점수", v: averages.score, color: scoreColor(averages.score) },
          { label: "평균 출석률", v: averages.attendance, color: "#0A84FF" },
          { label: "평균 총회 제출률", v: averages.assembly, color: "#5E5CE6" },
          { label: "평균 회비 납부율", v: averages.fee, color: "#30B0C7" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-[22px] p-4">
            <p className="text-xs font-semibold text-[#8E8E93]">{s.label}</p>
            <p className="text-[28px] font-bold tracking-[-0.03em] mt-1" style={{ color: s.v == null ? "#AEAEB2" : s.color }}>
              {s.v == null ? "–" : s.v}<span className="text-base text-[#AEAEB2] font-semibold">{s.v == null ? "" : s.label.includes("점수") ? "점" : "%"}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 필터 + 검색 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {([
            { id: "all", label: "전체" },
            { id: "low", label: "활동 적은 부원" },
            { id: "nodata", label: "기록 없음" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
                filter === f.id ? "bg-[#1D1D1F] text-white" : "bg-[#fff] text-[#1D1D1F]/70 border border-black/[0.06] hover:text-[#1D1D1F]"
              }`}
            >
              {f.label} <span className={filter === f.id ? "text-white/60" : "text-[#AEAEB2]"}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <label className="glass-card relative flex items-center w-full sm:w-64 h-10 rounded-full pl-10 pr-4">
          <Search className="absolute left-3.5 text-[#8E8E93] w-4 h-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·학번·상태 검색"
            className="w-full bg-transparent outline-none text-sm text-[#1D1D1F] placeholder:text-[#AEAEB2] !border-0 !shadow-none !bg-transparent"
          />
        </label>
      </div>

      <div className="glass-card rounded-[26px] overflow-hidden">
        {state === "loading" ? (
          <div className="py-20 flex items-center justify-center gap-2 text-sm text-[#8E8E93]"><Loader2 size={16} className="animate-spin" /> 불러오는 중이에요</div>
        ) : state === "error" ? (
          <div className="py-20 text-center text-sm text-[#8E8E93]">활동 현황을 불러오지 못했어요.</div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#8E8E93]">해당하는 부원이 없어요.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="border-b border-black/[0.06]">
                <tr>
                  <Th k="name" className="pl-5">부원</Th>
                  <Th k="attendance">출석</Th>
                  <Th k="assembly">총회 제출</Th>
                  <Th k="fee">회비</Th>
                  <Th k="score" className="pr-5">활동 점수</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {visible.map((r) => (
                  <tr key={r.loginId} className={r.score != null && r.score < LOW_SCORE ? "bg-[#FF3B30]/[0.03]" : ""}>
                    <td className="pl-5 pr-3 py-3">
                      <div className="flex items-center gap-3 min-w-[170px]">
                        <img
                          src={r.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=F2F2F7&color=1D1D1F`}
                          onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=F2F2F7&color=1D1D1F`; }}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-black/[0.06] shrink-0"
                          alt=""
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1D1D1F] truncate">{r.name}</p>
                          <p className="text-[11px] text-[#8E8E93]">{formatYear(r.studentId)}학번 · {r.userStatus}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><RateCell rate={r.attendance.rate} text={`${r.attendance.attended}/${r.attendance.total}회`} color="#0A84FF" /></td>
                    <td className="px-3 py-3">
                      <RateCell rate={r.assembly.rate} text={`${r.assembly.submitted}/${r.assembly.due}개월`} color="#5E5CE6" />
                      <p className="text-[10px] text-[#AEAEB2] mt-1 truncate max-w-[140px]">
                        {r.assembly.basis === "TEAM" ? `팀 ${r.assembly.teamName || ""}` : "개인"}
                      </p>
                    </td>
                    <td className="px-3 py-3"><RateCell rate={r.fee.rate} text={r.fee.due === 0 ? "대상 아님" : `${r.fee.paid}/${r.fee.due}개월`} color="#30B0C7" /></td>
                    <td className="pr-5 pl-3 py-3"><ScorePill score={r.score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
