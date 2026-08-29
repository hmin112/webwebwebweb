import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Search, Code2, Settings, Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";

type OjProblem = {
  id: number;
  _id: string;
  title: string;
  difficulty: "Low" | "Mid" | "High" | string;
  submission_number: number;
  accepted_number: number;
  my_status: number | null;
};

const DIFFICULTY_STYLE: Record<string, { label: string; color: string }> = {
  Low: { label: "쉬움", color: "#34C759" },
  Mid: { label: "보통", color: "#FF9500" },
  High: { label: "어려움", color: "#FF3B30" },
};

const DIFFICULTY_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "Low", label: "쉬움" },
  { value: "Mid", label: "보통" },
  { value: "High", label: "어려움" },
];

export const OjListPage = ({ loginId, isAdmin }: { loginId?: string; isAdmin?: boolean }) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<OjProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!loginId) return;
    api.get("/oj/tags")
      .then((res) => setTags((res.data?.value ?? []).map((t: any) => t.name)))
      .catch(() => {});
  }, [loginId]);

  useEffect(() => {
    if (!loginId) return;

    let active = true;
    setLoading(true);
    setErrorMsg("");

    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/oj/problems", {
          params: { loginId, keyword: keyword || undefined, difficulty: difficulty || undefined, tag: tag || undefined, limit: 100 },
        });
        if (active) {
          setProblems(res.data?.results ?? []);
        }
      } catch {
        if (active) setErrorMsg("문제 목록을 불러오지 못했습니다");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loginId, keyword, difficulty, tag]);

  if (!loginId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-[15px] font-medium text-slate-500">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            <Code2 size={22} className="text-slate-900" strokeWidth={2.2} />
            <h1 className="text-[22px] font-semibold text-slate-900 tracking-[-0.01em]">OJ</h1>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate("/oj/admin")}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Settings size={14} /> 문제 관리
            </button>
          )}
        </div>
        <p className="text-[13px] text-slate-400 mb-7">문제를 풀고 바로 채점 결과를 확인하세요</p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="문제 제목 또는 번호로 검색"
            className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
          />
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {DIFFICULTY_FILTERS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficulty(d.value)}
              className={`px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors ${
                difficulty === d.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setTag("")}
              className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors ${
                tag === "" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Folder size={13} /> 전체
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors ${
                  tag === t ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {errorMsg && <p className="text-[13px] font-medium text-center py-6" style={{ color: "#FF3B30" }}>{errorMsg}</p>}

        {!errorMsg && loading && <div className="h-40" />}

        {!errorMsg && !loading && problems.length === 0 && (
          <p className="text-[14px] text-slate-400 text-center py-16">조건에 맞는 문제가 없습니다</p>
        )}

        {!errorMsg && !loading && problems.length > 0 && (
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
            {problems.map((p) => {
              const solved = p.my_status === 0;
              const attempted = p.my_status !== null && p.my_status !== undefined && !solved;
              const diff = DIFFICULTY_STYLE[p.difficulty];
              return (
                <button
                  key={p._id}
                  onClick={() => navigate(`/oj/${p._id}`)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                >
                  <div className="w-6 shrink-0 flex justify-center">
                    {solved ? (
                      <CheckCircle2 size={18} strokeWidth={2.2} style={{ color: "#34C759" }} />
                    ) : attempted ? (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FF9500" }} />
                    ) : null}
                  </div>
                  <span className="w-14 shrink-0 text-[13px] font-medium text-slate-400 tabular-nums">
                    #{p._id}
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-slate-900 truncate">{p.title}</span>
                  {diff && (
                    <span
                      className="shrink-0 text-[12px] font-medium px-2.5 py-1 rounded-full"
                      style={{ color: diff.color, backgroundColor: `${diff.color}14` }}
                    >
                      {diff.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
