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

// 태그를 "OOP/2023/1학기"처럼 "/"로 나누면 그 자체가 중첩 폴더 경로가 됨.
const tagSegments = (tag: string) => tag.split("/").map((s) => s.trim()).filter(Boolean);

// 문제 번호(_id)가 숫자면 숫자 크기순으로, 아니면 뒤로 보내고 문자열 비교
const compareProblemId = (a: string, b: string) => {
  const aIsNum = /^\d+$/.test(a);
  const bIsNum = /^\d+$/.test(b);
  if (aIsNum && bIsNum) return Number(a) - Number(b);
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b);
};

// 현재 경로(path) 기준으로, 이 폴더 바로 안에 있는 하위 폴더들과 leaf 문제(이 경로 자체에 태그된 문제)를 계산
const computeFolderView = (problems: OjProblem[], path: string[]) => {
  const childIds = new Map<string, Set<number>>();
  const leafProblems: OjProblem[] = [];
  const leafIds = new Set<number>();

  problems.forEach((p) => {
    (p.tags ?? []).forEach((tag) => {
      const segs = tagSegments(tag);
      if (segs.length < path.length) return;
      for (let i = 0; i < path.length; i++) {
        if (segs[i] !== path[i]) return;
      }
      if (segs.length === path.length) {
        if (!leafIds.has(p.id)) {
          leafIds.add(p.id);
          leafProblems.push(p);
        }
      } else {
        const child = segs[path.length];
        if (!childIds.has(child)) childIds.set(child, new Set());
        childIds.get(child)!.add(p.id);
      }
    });
  });

  const childFolders = Array.from(childIds.entries())
    .map(([name, ids]) => ({ name, count: ids.size }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { childFolders, leafProblems };
};

const ROOT_ALL = "all";
const ROOT_UNTAGGED = "untagged";

export const OjListPage = ({ loginId, isAdmin }: { loginId?: string; isAdmin?: boolean }) => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<OjProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [path, setPath] = useState<string[]>([]);
  // 루트 화면에서만 쓰이는 "전체 문제"/"미분류" 특수 뷰
  const [rootView, setRootView] = useState<"folders" | typeof ROOT_ALL | typeof ROOT_UNTAGGED>("folders");
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

  // 폴더를 옮길 때마다 검색어 초기화
  useEffect(() => {
    setFolderSearch("");
    setProblemSearch("");
  }, [path, rootView]);

  const untaggedProblems = useMemo(() => problems.filter((p) => !p.tags || p.tags.length === 0), [problems]);

  const { childFolders, leafProblems } = useMemo(() => computeFolderView(problems, path), [problems, path]);

  const visibleChildFolders = useMemo(() => {
    if (!folderSearch.trim()) return childFolders;
    const q = folderSearch.trim().toLowerCase();
    return childFolders.filter((f) => f.name.toLowerCase().includes(q));
  }, [childFolders, folderSearch]);

  const visibleFolderLeafProblems = useMemo(() => {
    const base = !folderSearch.trim()
      ? leafProblems
      : leafProblems.filter((p) => {
          const q = folderSearch.trim().toLowerCase();
          return p.title.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
        });
    return [...base].sort((a, b) => compareProblemId(a._id, b._id));
  }, [leafProblems, folderSearch]);

  const isAtRoot = path.length === 0 && rootView === "folders";
  const showingLeafList = rootView === ROOT_ALL || rootView === ROOT_UNTAGGED;

  const baseLeafList = rootView === ROOT_ALL ? problems : rootView === ROOT_UNTAGGED ? untaggedProblems : leafProblems;

  const visibleLeafProblems = useMemo(() => {
    const base = !problemSearch.trim()
      ? baseLeafList
      : baseLeafList.filter((p) => {
          const q = problemSearch.trim().toLowerCase();
          return p.title.toLowerCase().includes(q) || p._id.toLowerCase().includes(q);
        });
    return [...base].sort((a, b) => compareProblemId(a._id, b._id));
  }, [baseLeafList, problemSearch]);

  const enterFolder = (name: string) => {
    setPath((prev) => [...prev, name]);
    setRootView("folders");
  };

  const goBack = () => {
    if (showingLeafList) {
      setRootView("folders");
      return;
    }
    setPath((prev) => prev.slice(0, -1));
  };

  const jumpToDepth = (depth: number) => {
    setPath((prev) => prev.slice(0, depth));
  };

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

        {!errorMsg && !loading && (
          <>
            {/* 브레드크럼 / 뒤로가기 (루트가 아닐 때만) */}
            {!isAtRoot && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap text-[13px] font-medium">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft size={16} /> 뒤로
                </button>
                <span className="text-slate-200">|</span>
                <button onClick={() => { setPath([]); setRootView("folders"); }} className="text-slate-400 hover:text-slate-700">
                  폴더 목록
                </button>
                {path.map((seg, idx) => (
                  <span key={idx} className="flex items-center gap-1.5">
                    <span className="text-slate-300">/</span>
                    <button
                      onClick={() => jumpToDepth(idx + 1)}
                      className={idx === path.length - 1 ? "text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-700"}
                    >
                      {seg}
                    </button>
                  </span>
                ))}
                {showingLeafList && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-semibold">{rootView === ROOT_ALL ? "전체 문제" : "미분류"}</span>
                  </span>
                )}
              </div>
            )}

            {/* 난이도 필터 (루트 폴더 목록 화면에서는 숨김) */}
            {!isAtRoot && (
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
            )}

            {/* 검색창: 폴더 목록 화면은 폴더 검색, 그 외에는 이 폴더 안에서 검색 */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              {showingLeafList ? (
                <input
                  value={problemSearch}
                  onChange={(e) => setProblemSearch(e.target.value)}
                  placeholder="문제 검색"
                  className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
                />
              ) : (
                <input
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  placeholder={isAtRoot ? "폴더 검색" : "이 폴더 안에서 검색"}
                  className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
                />
              )}
            </div>
            {/* 리프(전체 문제/미분류) 리스트 */}
            {showingLeafList ? (
              visibleLeafProblems.length === 0 ? (
                <p className="text-[14px] text-slate-400 text-center py-16">조건에 맞는 문제가 없습니다</p>
              ) : (
                <ProblemRows problems={visibleLeafProblems} onOpen={(id) => navigate(`/oj/${id}`)} />
              )
            ) : (
              <>
                {visibleChildFolders.length === 0 && visibleFolderLeafProblems.length === 0 ? (
                  <p className="text-[14px] text-slate-400 text-center py-16">
                    {folderSearch.trim() ? "조건에 맞는 폴더/문제가 없습니다" : "등록된 문제가 없습니다"}
                  </p>
                ) : (
                  <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
                    {isAtRoot && !folderSearch.trim() && (
                      <button
                        onClick={() => setRootView(ROOT_ALL)}
                        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                      >
                        <Folder size={17} className="shrink-0 text-slate-300" />
                        <span className="flex-1 text-[14px] font-medium text-slate-900">전체 문제</span>
                        <span className="text-[12px] font-medium text-slate-400">{problems.length}개</span>
                        <ChevronRight size={15} className="shrink-0 text-slate-200" />
                      </button>
                    )}
                    {visibleChildFolders.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => enterFolder(f.name)}
                        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                      >
                        <Folder size={17} className="shrink-0 text-slate-300" />
                        <span className="flex-1 text-[14px] font-medium text-slate-900 truncate">{f.name}</span>
                        <span className="text-[12px] font-medium text-slate-400">{f.count}개</span>
                        <ChevronRight size={15} className="shrink-0 text-slate-200" />
                      </button>
                    ))}
                    {isAtRoot && !folderSearch.trim() && untaggedProblems.length > 0 && (
                      <button
                        onClick={() => setRootView(ROOT_UNTAGGED)}
                        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
                      >
                        <Folder size={17} className="shrink-0 text-slate-300" />
                        <span className="flex-1 text-[14px] font-medium text-slate-900">미분류</span>
                        <span className="text-[12px] font-medium text-slate-400">{untaggedProblems.length}개</span>
                        <ChevronRight size={15} className="shrink-0 text-slate-200" />
                      </button>
                    )}
                    {visibleFolderLeafProblems.length > 0 && (
                      <ProblemRows problems={visibleFolderLeafProblems} onOpen={(id) => navigate(`/oj/${id}`)} bare />
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

// 문제 행 목록 — 폴더 안(bare, 카드 없이 이어붙임) 또는 단독(전체/미분류, 자체 카드) 두 방식으로 재사용
const ProblemRows = ({ problems, onOpen, bare }: { problems: OjProblem[]; onOpen: (id: string) => void; bare?: boolean }) => {
  const rows = problems.map((p) => {
    const solved = p.my_status === 0;
    const attempted = p.my_status !== null && p.my_status !== undefined && !solved;
    const diff = DIFFICULTY_STYLE[p.difficulty];
    return (
      <button
        key={p._id}
        onClick={() => onOpen(p._id)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/80 transition-colors"
      >
        <div className="w-6 shrink-0 flex justify-center">
          {solved ? (
            <CheckCircle2 size={18} strokeWidth={2.2} style={{ color: "#34C759" }} />
          ) : attempted ? (
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FF9500" }} />
          ) : null}
        </div>
        <span className="shrink-0 whitespace-nowrap w-16 truncate text-[13px] font-medium text-slate-400 tabular-nums">
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
  });

  if (bare) return <>{rows}</>;

  return (
    <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
      {rows}
    </div>
  );
};
