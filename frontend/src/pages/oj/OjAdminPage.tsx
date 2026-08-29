import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Eye, EyeOff, Trash2, Pencil, Folder } from "lucide-react";
import { api } from "../../api/axios";

type AdminProblem = {
  id: number;
  _id: string;
  title: string;
  difficulty: string;
  visible: boolean;
  tags: string[];
};

const DIFFICULTY_STYLE: Record<string, { label: string; color: string }> = {
  Low: { label: "쉬움", color: "#34C759" },
  Mid: { label: "보통", color: "#FF9500" },
  High: { label: "어려움", color: "#FF3B30" },
};

export const OjAdminPage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeFolder, setActiveFolder] = useState<string>("");

  const fetchProblems = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get("/admin/oj/problems", { params: { keyword: keyword || undefined, limit: 200 } });
      setProblems(res.data?.results ?? []);
    } catch {
      setErrorMsg("문제 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchProblems, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [problems]);

  const visibleProblems = useMemo(() => {
    if (!activeFolder) return problems;
    return problems.filter((p) => (p.tags || []).includes(activeFolder));
  }, [problems, activeFolder]);

  const handleToggleVisibility = async (p: AdminProblem) => {
    try {
      await api.put(`/admin/oj/problems/${p.id}/visibility`, null, { params: { visible: !p.visible } });
      setProblems((prev) => prev.map((x) => (x.id === p.id ? { ...x, visible: !x.visible } : x)));
    } catch {
      alert("공개 상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async (p: AdminProblem) => {
    if (!window.confirm(`"${p.title}" 문제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/oj/problems/${p.id}`);
      setProblems((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-28 pb-20">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <button
          onClick={() => navigate("/oj")}
          className="flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft size={15} /> OJ 목록으로
        </button>

        <div className="flex items-center justify-between mb-1.5">
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-[-0.01em]">문제 관리</h1>
          <button
            onClick={() => navigate("/oj/admin/write")}
            className="flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} /> 새 문제 등록
          </button>
        </div>
        <p className="text-[13px] text-slate-400 mb-7">문제 생성 · 공개/숨김 · 삭제 · 태그(폴더) 관리</p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="문제 제목 또는 번호로 검색"
            className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
          />
        </div>

        {folders.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setActiveFolder("")}
              className={`flex items-center gap-1.5 px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors ${
                activeFolder === "" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Folder size={13} /> 전체
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFolder(f)}
                className={`px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors ${
                  activeFolder === f ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {errorMsg && <p className="text-[13px] font-medium text-center py-6" style={{ color: "#FF3B30" }}>{errorMsg}</p>}
        {!errorMsg && loading && <div className="h-40" />}
        {!errorMsg && !loading && visibleProblems.length === 0 && (
          <p className="text-[14px] text-slate-400 text-center py-16">등록된 문제가 없습니다</p>
        )}

        {!errorMsg && !loading && visibleProblems.length > 0 && (
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
            {visibleProblems.map((p) => {
              const diff = DIFFICULTY_STYLE[p.difficulty];
              return (
                <div key={p.id} className="flex items-center gap-3 px-6 py-4">
                  <span className="w-16 shrink-0 text-[13px] font-medium text-slate-400 tabular-nums truncate">#{p._id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-slate-900 truncate">{p.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {(p.tags || []).map((t) => (
                        <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-100">{t}</span>
                      ))}
                    </div>
                  </div>
                  {diff && (
                    <span
                      className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ color: diff.color, backgroundColor: `${diff.color}14` }}
                    >
                      {diff.label}
                    </span>
                  )}
                  <span
                    className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ color: p.visible ? "#34C759" : "#8E8E93", backgroundColor: p.visible ? "#34C75914" : "#8E8E9314" }}
                  >
                    {p.visible ? "공개" : "숨김"}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleVisibility(p)}
                      title={p.visible ? "숨기기" : "공개하기"}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      {p.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => navigate(`/oj/admin/write/${p.id}`)}
                      title="수정"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      title="삭제"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
