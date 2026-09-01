import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Search, Code2, Settings, Folder, ChevronLeft, ChevronRight } from "lucide-react";
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
  tags?: string[];
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

const ALL_FOLDER = "__all__";
const UNTAGGED_FOLDER = "__untagged__";

// 문제 번호(_id)가 숫자면 숫자 크기순으로, 아니면(예: "devsign", "T2602") 뒤로 보내고 문자열 비교
const compareProblemId = (a: string, b: string) => {
  const aIsNum = /^\d+$/.test(a);
  const bIsNum = /^\d+$/.test(b);
  if (aIsNum && bIsNum) return Number(a) - Number(b);
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b);
};

export const OjListPage = ({ loginId, isAdmin }: { loginId?: string; isAdmin?: boolean }) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<OjProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [difficulty, setDifficulty] = useState("");
  // null = 폴더 목록 화면. 폴더를 누르면 그 폴더 안의 문제만 보임
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderSearch, setFolderSearch] = useState("");
  const [problemSearch, setProblemSearch] = useState("");

  useEffect(() => {
    if (!loginId) return;

    let active = true;
    setLoading(true);
    setErrorMsg("");

    api.get("/oj/problems", { params: { loginId, difficulty: difficulty || undefined, limit: 200 } })
      .then((res) => {
        if (active) setProblems(res.data?.results ?? []);
      })
      .catch(() => {
        if (active) setErrorMsg("문제 목록을 불러오지 못했습니다");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loginId, difficulty]);

  // 폴더를 바꿀 때마다 문제 검색어는 초기화
  useEffect(() => {
    setProblemSearch("");
  }, [selectedFolder]);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    let untagged = 0;
    problems.forEach((p) => {
      if (!p.tags || p.tags.length === 0) {
        untagged++;
        return;
      }
      p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    });
    const list: { key: string; name: string; count: number }[] = Array.from(counts.entries())
      .map(([name, count]) => ({ key: name, name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (untagged > 0) list.push({ key: UNTAGGED_FOLDER, name: "미분류", count: untagged });
    return list;
  }, [problems]);

  const visibleFolders = useMemo(() => {
    if (!folderSearch.trim()) return folders;
    const q = folderSearch.trim().toLowerCase();
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, folderSearch]);

  const showFolderGrid = !selectedFolder;

  const folderProblems = useMemo(() => {
    if (selectedFolder === ALL_FOLDER) return problems;
    if (selectedFolder === UNTAGGED_FOLDER) return problems.filter((p) => !p.tags || p.tags.length === 0);
    if (selectedFolder) return problems.filter((p) => (p.tags ?? []).includes(selectedFolder));
    return [];
  }, [problems, selectedFolder]);

  const visibleProblems = useMemo(() => {
    const base = !problemSearch.trim()
      ? folderProblems
      : folderProblems.filter((p) => {
          const q = problemSearch.trim().toLowerCase();
          return p.title.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
        });
    return [...base].sort((a, b) => compareProblemId(a._id, b._id));
  }, [folderProblems, problemSearch]);

  const currentFolderLabel =
    selectedFolder === ALL_FOLDER ? "전체 문제" : selectedFolder === UNTAGGED_FOLDER ? "미분류" : selectedFolder;

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
        <p className="text-[13px] text-slate-400 mb-7">폴더를 눌러 문제를 확인하세요</p>

        {errorMsg && <p className="text-[13px] font-medium text-center py-6" style={{ color: "#FF3B30" }}>{errorMsg}</p>}

        {!errorMsg && loading && <div className="h-40" />}

        {/* 폴더 목록 화면 */}
        {!errorMsg && !loading && showFolderGrid && (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder="폴더 검색"
                className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
              />
            </div>

            {visibleFolders.length === 0 ? (
              <p className="text-[14px] text-slate-400 text-center py-16">
                {folderSearch.trim() ? "조건에 맞는 폴더가 없습니다" : "등록된 문제가 없습니다"}
              </p>
            ) : (
              <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
                {!folderSearch.trim() && (
                  <button
                    onClick={() => setSelectedFolder(ALL_FOLDER)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <Folder size={17} className="shrink-0 text-slate-300" />
                    <span className="flex-1 text-[14px] font-medium text-slate-900">전체 문제</span>
                    <span className="text-[12px] font-medium text-slate-400">{problems.length}개</span>
                    <ChevronRight size={15} className="shrink-0 text-slate-200" />
                  </button>
                )}
                {visibleFolders.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setSelectedFolder(f.key)}
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <Folder size={17} className="shrink-0 text-slate-300" />
                    <span className="flex-1 text-[14px] font-medium text-slate-900 truncate">{f.name}</span>
                    <span className="text-[12px] font-medium text-slate-400">{f.count}개</span>
                    <ChevronRight size={15} className="shrink-0 text-slate-200" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* 문제 목록 화면 (폴더 안) */}
        {!errorMsg && !loading && !showFolderGrid && (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedFolder(null)}
                className="flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={16} /> 폴더 목록
              </button>
              <span className="text-[13px] font-medium text-slate-400">{currentFolderLabel}</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
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

            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                placeholder="이 폴더 안에서 문제 검색"
                className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
              />
            </div>

            {visibleProblems.length === 0 ? (
              <p className="text-[14px] text-slate-400 text-center py-16">조건에 맞는 문제가 없습니다</p>
            ) : (
              <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
                {visibleProblems.map((p) => {
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
                      <span className="shrink-0 whitespace-nowrap min-w-[52px] max-w-[35%] truncate text-[13px] font-medium text-slate-400 tabular-nums">
                        #{p._id}
                      </span>
                      <span className="flex-1 min-w-0 text-[14px] font-medium text-slate-900 truncate">{p.title}</span>
                      {diff && (
                        <span
                          className="shrink-0 text-[12px] font-medium px-2.5 py-1 rounded-full"
                          style={{ color: diff.color, backgroundColor: `${diff.color}14` }}
                        >
                          {diff.label}
                        </span>
                      )}
                      <ChevronRight size={15} className="shrink-0 text-slate-200" />
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};
