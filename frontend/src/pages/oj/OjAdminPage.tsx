import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Eye, EyeOff, Trash2, Pencil, Folder,
  Check, X, ChevronLeft, ChevronRight, GripVertical, FolderPlus, List,
} from "lucide-react";
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

// 문제 번호(_id)가 숫자면 숫자 크기순으로, 아니면 뒤로 보내고 문자열 비교
const compareProblemId = (a: string, b: string) => {
  const aIsNum = /^\d+$/.test(a);
  const bIsNum = /^\d+$/.test(b);
  if (aIsNum && bIsNum) return Number(a) - Number(b);
  if (aIsNum) return -1;
  if (bIsNum) return 1;
  return a.localeCompare(b);
};

// "OOP/2023"처럼 "/"로 나누면 그 자체가 중첩 폴더 경로가 됨
const tagSegments = (tag: string) => tag.split("/").map((s) => s.trim()).filter(Boolean);

// 현재 경로 바로 아래의 하위 폴더(태그로 만들어진 것 + 레지스트리에 미리 만들어둔 빈 폴더 포함)와
// 정확히 이 경로에 태그된 leaf 문제를 계산
const computeFolderView = (problems: AdminProblem[], registeredFolders: string[], path: string[]) => {
  const childIds = new Map<string, Set<number>>();
  const leafProblems: AdminProblem[] = [];
  const leafIds = new Set<number>();

  const ensureChild = (name: string) => {
    if (!childIds.has(name)) childIds.set(name, new Set());
  };

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
        ensureChild(child);
        childIds.get(child)!.add(p.id);
      }
    });
  });

  registeredFolders.forEach((full) => {
    const segs = tagSegments(full);
    if (segs.length <= path.length) return;
    for (let i = 0; i < path.length; i++) {
      if (segs[i] !== path[i]) return;
    }
    ensureChild(segs[path.length]);
  });

  const childFolders = Array.from(childIds.entries())
    .map(([name, ids]) => ({ name, count: ids.size }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { childFolders, leafProblems };
};

export const OjAdminPage = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<AdminProblem[]>([]);
  const [registeredFolders, setRegisteredFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [keyword, setKeyword] = useState("");
  const [path, setPath] = useState<string[]>([]);
  const [flatView, setFlatView] = useState(false);

  const [renamingFolder, setRenamingFolder] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const fetchProblems = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.get("/admin/oj/problems", { params: { keyword: keyword || undefined, limit: 1000 } });
      setProblems(res.data?.results ?? []);
    } catch {
      setErrorMsg("문제 목록을 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get("/admin/oj/folders");
      setRegisteredFolders(res.data ?? []);
    } catch {
      // 조용히 무시 — 태그 기반 폴더는 어차피 계속 보임
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchProblems, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  useEffect(() => {
    setRenamingFolder(false);
    setCreatingFolder(false);
  }, [path]);

  const searching = keyword.trim().length > 0;
  const showTree = !searching && !flatView;

  const { childFolders, leafProblems } = useMemo(
    () => computeFolderView(problems, registeredFolders, path),
    [problems, registeredFolders, path]
  );

  const sortedProblems = useMemo(() => [...problems].sort((a, b) => compareProblemId(a._id, b._id)), [problems]);
  const sortedLeafProblems = useMemo(() => [...leafProblems].sort((a, b) => compareProblemId(a._id, b._id)), [leafProblems]);

  const currentPathStr = path.join("/");
  const isEmptyFolder = path.length > 0 && childFolders.length === 0 && leafProblems.length === 0;

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

  const enterFolder = (name: string) => setPath((prev) => [...prev, name]);
  const goUp = () => setPath((prev) => prev.slice(0, -1));
  const jumpTo = (depth: number) => setPath((prev) => prev.slice(0, depth));
  const goToRoot = () => {
    setPath([]);
    setFlatView(false);
  };

  const startCreateFolder = () => {
    setNewFolderName("");
    setCreatingFolder(true);
  };

  const confirmCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      setCreatingFolder(false);
      return;
    }
    if (name.includes("/")) {
      alert("여기서는 한 단계 폴더 이름만 입력해주세요 ('/' 없이).");
      return;
    }
    try {
      await api.post("/admin/oj/folders", null, { params: { path: [...path, name].join("/") } });
      await fetchFolders();
      setCreatingFolder(false);
    } catch {
      alert("폴더 생성에 실패했습니다.");
    }
  };

  const deleteEmptyFolder = async () => {
    if (!window.confirm(`"${currentPathStr}" 폴더를 삭제하시겠습니까?`)) return;
    try {
      await api.delete("/admin/oj/folders", { params: { path: currentPathStr } });
      await fetchFolders();
      goUp();
    } catch {
      alert("폴더 삭제에 실패했습니다.");
    }
  };

  const startRenameFolder = () => {
    setRenameValue(path[path.length - 1] ?? "");
    setRenamingFolder(true);
  };

  const cancelRenameFolder = () => {
    setRenamingFolder(false);
    setRenameValue("");
  };

  const confirmRenameFolder = async () => {
    const newLeaf = renameValue.trim();
    if (!newLeaf || newLeaf === path[path.length - 1]) {
      cancelRenameFolder();
      return;
    }
    const oldPath = currentPathStr;
    const newPath = [...path.slice(0, -1), newLeaf].join("/");
    setRenaming(true);
    try {
      const res = await api.put("/admin/oj/folders/rename", null, { params: { oldName: oldPath, newName: newPath } });
      setRenamingFolder(false);
      setPath((prev) => [...prev.slice(0, -1), newLeaf]);
      await Promise.all([fetchProblems(), fetchFolders()]);
      alert(`"${oldPath}" → "${newPath}"로 변경했습니다. (문제 ${res.data?.updatedCount ?? 0}개 반영)`);
    } catch {
      alert("폴더 이름 변경에 실패했습니다.");
    } finally {
      setRenaming(false);
    }
  };

  const handleDropOnFolder = async (folderName: string) => {
    const id = draggingId;
    setDraggingId(null);
    setDragOverFolder(null);
    if (id == null) return;
    const targetPath = [...path, folderName].join("/");
    try {
      await api.put(`/admin/oj/problems/${id}/tags`, null, { params: { folder: targetPath } });
      await fetchProblems();
    } catch {
      alert("문제를 폴더에 넣는 데 실패했습니다.");
    }
  };

  const displayedProblems = searching || flatView ? sortedProblems : sortedLeafProblems;

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
        <p className="text-[13px] text-slate-400 mb-7">
          폴더를 눌러 들어가고, 문제를 폴더 위로 끌어다 놓으면 그 폴더에 담깁니다.
        </p>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="문제 제목 또는 번호로 검색 (전체 폴더에서 검색됩니다)"
            className="w-full h-11 pl-11 pr-4 text-[14px] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
          />
        </div>

        {!searching && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap text-[13px] font-medium">
              {path.length > 0 && (
                <button onClick={goUp} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors">
                  <ChevronLeft size={16} /> 뒤로
                </button>
              )}
              <button onClick={goToRoot} className={`flex items-center gap-1 ${path.length === 0 && !flatView ? "text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-700"}`}>
                <Folder size={13} /> 폴더 목록
              </button>
              {path.map((seg, idx) => (
                <span key={idx} className="flex items-center gap-1.5">
                  <span className="text-slate-300">/</span>
                  <button
                    onClick={() => jumpTo(idx + 1)}
                    className={idx === path.length - 1 && !flatView ? "text-slate-900 font-semibold" : "text-slate-400 hover:text-slate-700"}
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={() => setFlatView((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-medium transition-colors ${
                flatView ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <List size={13} /> 전체 목록
            </button>
          </div>
        )}

        {!searching && showTree && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {renamingFolder ? (
              <>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmRenameFolder()}
                  className="h-8 px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-900"
                />
                <button onClick={confirmRenameFolder} disabled={renaming} className="p-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-50" title="저장">
                  <Check size={14} />
                </button>
                <button onClick={cancelRenameFolder} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700" title="취소">
                  <X size={14} />
                </button>
              </>
            ) : path.length > 0 ? (
              <button onClick={startRenameFolder} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors">
                <Pencil size={12} /> 이름 변경
              </button>
            ) : null}

            {creatingFolder ? (
              <>
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmCreateFolder()}
                  placeholder="새 폴더 이름"
                  className="h-8 px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-900"
                />
                <button onClick={confirmCreateFolder} className="p-1.5 rounded-lg bg-slate-900 text-white" title="만들기">
                  <Check size={14} />
                </button>
                <button onClick={() => setCreatingFolder(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700" title="취소">
                  <X size={14} />
                </button>
              </>
            ) : (
              <button onClick={startCreateFolder} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-700 transition-colors">
                <FolderPlus size={13} /> 새 폴더
              </button>
            )}

            {isEmptyFolder && !renamingFolder && (
              <button onClick={deleteEmptyFolder} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={12} /> 빈 폴더 삭제
              </button>
            )}
          </div>
        )}

        {errorMsg && <p className="text-[13px] font-medium text-center py-6" style={{ color: "#FF3B30" }}>{errorMsg}</p>}
        {!errorMsg && loading && <div className="h-40" />}

        {!errorMsg && !loading && (
          <>
            {showTree && childFolders.length === 0 && leafProblems.length === 0 ? (
              <p className="text-[14px] text-slate-400 text-center py-16">이 폴더는 비어 있습니다</p>
            ) : showTree ? (
              <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
                {childFolders.map((f) => (
                  <div
                    key={f.name}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverFolder !== f.name) setDragOverFolder(f.name);
                    }}
                    onDragLeave={() => setDragOverFolder((cur) => (cur === f.name ? null : cur))}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnFolder(f.name);
                    }}
                    onClick={() => enterFolder(f.name)}
                    className={`w-full flex items-center gap-4 px-6 py-4 text-left cursor-pointer transition-all duration-150 ${
                      dragOverFolder === f.name ? "bg-indigo-50 ring-2 ring-inset ring-indigo-300" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <Folder size={17} className="shrink-0 text-slate-300" />
                    <span className="flex-1 text-[14px] font-medium text-slate-900 truncate">{f.name}</span>
                    <span className="text-[12px] font-medium text-slate-400">{f.count}개</span>
                    <ChevronRight size={15} className="shrink-0 text-slate-200" />
                  </div>
                ))}
                {sortedLeafProblems.map((p) => (
                  <ProblemRow
                    key={p.id}
                    p={p}
                    draggable
                    dragging={draggingId === p.id}
                    onDragStart={() => setDraggingId(p.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onToggleVisibility={() => handleToggleVisibility(p)}
                    onEdit={() => navigate(`/oj/admin/write/${p.id}`)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </div>
            ) : displayedProblems.length === 0 ? (
              <p className="text-[14px] text-slate-400 text-center py-16">조건에 맞는 문제가 없습니다</p>
            ) : (
              <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden divide-y divide-black/[0.04]">
                {displayedProblems.map((p) => (
                  <ProblemRow
                    key={p.id}
                    p={p}
                    onToggleVisibility={() => handleToggleVisibility(p)}
                    onEdit={() => navigate(`/oj/admin/write/${p.id}`)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

const ProblemRow = ({
  p,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onToggleVisibility,
  onEdit,
  onDelete,
}: {
  p: AdminProblem;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const diff = DIFFICULTY_STYLE[p.difficulty];
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 px-6 py-4 transition-opacity ${dragging ? "opacity-30" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {draggable && <GripVertical size={14} className="shrink-0 text-slate-200" />}
      <span className="shrink-0 w-16 text-[13px] font-medium text-slate-400 tabular-nums truncate">#{p._id}</span>
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
        <button onClick={onToggleVisibility} title={p.visible ? "숨기기" : "공개하기"} className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors">
          {p.visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button onClick={onEdit} title="수정" className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors">
          <Pencil size={16} />
        </button>
        <button onClick={onDelete} title="삭제" className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
