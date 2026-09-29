import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Cpu, Play, Pencil, Check, X, Plus, Code2, Users, User } from "lucide-react";
import Editor from "@monaco-editor/react";
import { api } from "../../api/axios";

type OjProblemDetail = {
  id: number;
  _id: string;
  title: string;
  description: string;
  input_description: string;
  output_description: string;
  hint: string;
  samples: { input: string; output: string }[];
  languages: string[];
  template: Record<string, string>;
  time_limit: number;
  memory_limit: number;
  difficulty: string;
};

type OjSubmission = {
  id: string;
  result: number;
  language: string;
  create_time: string;
  statistic_info?: { time_cost?: number; memory_cost?: number };
  code?: string;
  memberName?: string;
  memberStudentId?: string | null;
  mine?: boolean;
};

const shortStudentId = (id?: string | null) => (id && String(id).length === 8 ? String(id).substring(2, 4) : id || "");

const formatSubmitTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const MONACO_LANGUAGE: Record<string, string> = {
  C: "c",
  "C++": "cpp",
  Java: "java",
  Python2: "python",
  Python3: "python",
  Golang: "go",
};

const RESULT_STYLE: Record<number, { label: string; color: string }> = {
  [-2]: { label: "컴파일 에러", color: "#FF3B30" },
  [-1]: { label: "오답", color: "#FF3B30" },
  [0]: { label: "정답", color: "#34C759" },
  [1]: { label: "시간 초과", color: "#FF9500" },
  [2]: { label: "시간 초과", color: "#FF9500" },
  [3]: { label: "메모리 초과", color: "#FF9500" },
  [4]: { label: "런타임 에러", color: "#FF3B30" },
  [5]: { label: "시스템 에러", color: "#8E8E93" },
  [6]: { label: "대기중", color: "#8E8E93" },
  [7]: { label: "채점중", color: "#8E8E93" },
  [8]: { label: "부분 정답", color: "#FF9500" },
};

const isPending = (result: number) => result === 6 || result === 7;

export const OjProblemPage = ({ loginId, isAdmin }: { loginId?: string; isAdmin?: boolean }) => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<OjProblemDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [language, setLanguage] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<OjSubmission | null>(null);
  const [history, setHistory] = useState<OjSubmission[]>([]);
  // ✨ [2026-09-29] 모든 부원의 제출도 참고용으로 열람 — 목록 탭 + 코드 보기 창
  const [historyScope, setHistoryScope] = useState<"mine" | "all">("mine");
  const historyScopeRef = useRef(historyScope);
  historyScopeRef.current = historyScope; // 채점 폴링(setInterval) 안에서 최신 탭 값을 읽기 위해
  const [allHistory, setAllHistory] = useState<OjSubmission[] | null>(null);
  const [viewing, setViewing] = useState<OjSubmission | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [editingStatement, setEditingStatement] = useState(false);
  const [editSamples, setEditSamples] = useState<{ input: string; output: string }[]>([]);
  const [savingStatement, setSavingStatement] = useState(false);
  const descriptionEditRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loginId || !problemId) return;
    let active = true;

    (async () => {
      try {
        const res = await api.get(`/oj/problems/${problemId}`, { params: { loginId } });
        if (!active) return;
        const detail: OjProblemDetail = res.data;
        setProblem(detail);
        const firstLang = detail.languages?.[0] ?? "";
        setLanguage(firstLang);
        setCode(detail.template?.[firstLang] ?? "");
      } catch {
        if (active) setLoadError("문제를 불러오지 못했습니다");
      }
    })();

    fetchHistory();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginId, problemId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const fetchHistory = async () => {
    if (!loginId || !problemId) return;
    try {
      const res = await api.get("/oj/submissions", {
        params: { loginId, problemDisplayId: problemId, limit: 10 },
      });
      setHistory(res.data?.results ?? []);
    } catch {
      // 이력 조회 실패는 조용히 무시
    }
  };

  const fetchAllHistory = async () => {
    if (!loginId || !problemId) return;
    try {
      const res = await api.get("/oj/submissions", {
        params: { loginId, problemDisplayId: problemId, limit: 50, scope: "all" },
      });
      setAllHistory(res.data?.results ?? []);
    } catch {
      setAllHistory([]);
    }
  };

  const switchScope = (scope: "mine" | "all") => {
    setHistoryScope(scope);
    if (scope === "all") fetchAllHistory();
  };

  const openSubmission = async (sub: OjSubmission) => {
    setViewing(sub);
    setViewLoading(true);
    try {
      const res = await api.get(`/oj/submissions/${sub.id}`, { params: { loginId } });
      setViewing({ ...sub, ...res.data });
    } catch (e: any) {
      alert(e?.response?.data?.message || "제출 코드를 불러오지 못했습니다");
      setViewing(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(problem?.template?.[lang] ?? "");
  };

  const pollSubmission = (submissionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/oj/submissions/${submissionId}`, { params: { loginId } });
        const sub: OjSubmission = res.data;
        setActiveSubmission(sub);
        if (!isPending(sub.result)) {
          if (pollRef.current) clearInterval(pollRef.current);
          fetchHistory();
          if (historyScopeRef.current === "all") fetchAllHistory();
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!problem || !loginId || submitting) return;
    setSubmitting(true);
    setActiveSubmission(null);
    try {
      const res = await api.post("/oj/submissions", {
        loginId,
        problemId: problem.id,
        language,
        code,
      });
      const submissionId = res.data?.submission_id;
      if (submissionId) {
        setActiveSubmission({ id: submissionId, result: 6, language, create_time: "" });
        pollSubmission(submissionId);
      }
    } catch (e: any) {
      setLoadError(e?.response?.data?.message || "제출에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditStatement = () => {
    if (!problem) return;
    setEditSamples(
      problem.samples && problem.samples.length > 0
        ? problem.samples.map((s) => ({ ...s }))
        : [{ input: "", output: "" }]
    );
    setEditingStatement(true);
  };

  const cancelEditStatement = () => setEditingStatement(false);

  // 설명은 raw HTML을 편집하는 게 아니라, 화면에 실제로 보이는 그대로(contentEditable)를 편집해서
  // 저장 시 그 결과 HTML을 그대로 보낸다 — <p> 같은 태그를 직접 타이핑할 필요가 없도록.
  const saveStatement = async () => {
    if (!problem) return;
    setSavingStatement(true);
    try {
      const descriptionHtml = descriptionEditRef.current?.innerHTML ?? problem.description;
      const samples = editSamples.filter((s) => s.input.trim() || s.output.trim());
      await api.put(`/admin/oj/problems/${problem.id}/statement`, { description: descriptionHtml, samples });
      setProblem((prev) => (prev ? { ...prev, description: descriptionHtml, samples } : prev));
      setEditingStatement(false);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSavingStatement(false);
    }
  };

  if (!loginId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-[15px] font-medium text-slate-500">로그인이 필요한 서비스입니다.</p>
      </div>
    );
  }

  if (loadError && !problem) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-[15px] font-medium" style={{ color: "#FF3B30" }}>{loadError}</p>
      </div>
    );
  }

  if (!problem) {
    return <div className="min-h-[60vh]" />;
  }

  const resultStyle = activeSubmission ? RESULT_STYLE[activeSubmission.result] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-20">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <button
          onClick={() => navigate("/oj")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-slate-600 mb-5 transition-colors"
        >
          <ArrowLeft size={15} />
          목록으로
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 문제 설명 */}
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] p-7 max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-[13px] font-medium text-slate-400">#{problem._id}</p>
              {isAdmin && (
                editingStatement ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={saveStatement}
                      disabled={savingStatement}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold disabled:opacity-50"
                    >
                      <Check size={12} /> 저장
                    </button>
                    <button
                      onClick={cancelEditStatement}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-slate-400 hover:text-slate-700 text-[11px] font-semibold"
                    >
                      <X size={12} /> 취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startEditStatement}
                    title="문제/예제 수정"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Pencil size={15} />
                  </button>
                )
              )}
            </div>
            <h1 className="text-[20px] font-semibold text-slate-900 tracking-[-0.01em] mb-4">{problem.title}</h1>

            <div className="flex items-center gap-4 mb-6 text-[12px] text-slate-400">
              <span className="flex items-center gap-1"><Clock size={13} /> {problem.time_limit}ms</span>
              <span className="flex items-center gap-1"><Cpu size={13} /> {problem.memory_limit}MB</span>
            </div>

            {editingStatement ? (
              <div
                key={problem.id}
                ref={descriptionEditRef}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: problem.description }}
                className="prose prose-sm max-w-none text-[14px] text-slate-700 leading-relaxed [&_p]:mb-3 min-h-[200px] p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            ) : (
              <div className="prose prose-sm max-w-none text-[14px] text-slate-700 leading-relaxed [&_p]:mb-3">
                <div dangerouslySetInnerHTML={{ __html: problem.description }} />
              </div>
            )}
          </div>

          {/* 오른쪽: 예제 (에디터보다 넓게 써서 출력이 한 줄로 보이도록) + 제출 이력 */}
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] p-7 max-h-[calc(100vh-180px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-semibold text-slate-900">예제</p>
              {editingStatement && (
                <button
                  onClick={() => setEditSamples((prev) => [...prev, { input: "", output: "" }])}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                >
                  <Plus size={12} /> 예제 추가
                </button>
              )}
            </div>

            {editingStatement ? (
              editSamples.map((sample, i) => (
                <div key={i} className={i > 0 ? "mt-5" : ""}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-semibold text-slate-500">예제 {i + 1}</p>
                    {editSamples.length > 1 && (
                      <button
                        onClick={() => setEditSamples((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-1">입력</p>
                      <textarea
                        value={sample.input}
                        onChange={(e) =>
                          setEditSamples((prev) => prev.map((s, idx) => (idx === i ? { ...s, input: e.target.value } : s)))
                        }
                        className="w-full min-h-[70px] text-[12px] font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:bg-white focus:border-slate-900 resize-y"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-1">출력</p>
                      <textarea
                        value={sample.output}
                        onChange={(e) =>
                          setEditSamples((prev) => prev.map((s, idx) => (idx === i ? { ...s, output: e.target.value } : s)))
                        }
                        className="w-full min-h-[70px] text-[12px] font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:bg-white focus:border-slate-900 resize-y"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              problem.samples?.map((sample, i) => (
                <div key={i} className={i > 0 ? "mt-5" : ""}>
                  <p className="text-[12px] font-semibold text-slate-500 mb-2">예제 {i + 1}</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-1">입력</p>
                      <pre className="text-[12px] bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre overflow-x-auto">{sample.input}</pre>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-1">출력</p>
                      <pre className="text-[12px] bg-slate-50 border border-slate-200 rounded-xl p-3 whitespace-pre overflow-x-auto">{sample.output}</pre>
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="mt-7 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-1 mb-3 p-1 bg-slate-100 rounded-xl w-fit">
                {([["mine", "내 제출", <User size={12} key="u" />], ["all", "모든 부원 제출", <Users size={12} key="a" />]] as const).map(([key, label, icon]) => (
                  <button
                    key={key}
                    onClick={() => switchScope(key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                      historyScope === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              {(() => {
                const rows = historyScope === "mine" ? history : allHistory;
                if (rows === null) return <p className="text-[12px] text-slate-400 py-2">불러오는 중...</p>;
                if (rows.length === 0) {
                  return (
                    <p className="text-[12px] text-slate-400 py-2">
                      {historyScope === "mine" ? "아직 제출한 기록이 없어요" : "아직 이 문제를 제출한 부원이 없어요"}
                    </p>
                  );
                }
                return (
                  <div className="space-y-0.5 max-h-[320px] overflow-y-auto -mx-2">
                    {rows.map((h) => {
                      const style = RESULT_STYLE[h.result] ?? { label: "-", color: "#8E8E93" };
                      return (
                        <button
                          key={h.id}
                          onClick={() => openSubmission(h)}
                          className="w-full flex items-center justify-between gap-2 text-[12px] py-1.5 px-2 rounded-lg hover:bg-slate-50 text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {historyScope === "all" && (
                              <span className={`font-semibold truncate ${h.mine ? "text-indigo-600" : "text-slate-700"}`}>
                                {shortStudentId(h.memberStudentId)} {h.memberName}
                              </span>
                            )}
                            <span className="text-slate-400 shrink-0">{h.language}</span>
                            <span className="text-slate-300 shrink-0 hidden sm:inline">{formatSubmitTime(h.create_time)}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-medium" style={{ color: style.color }}>{style.label}</span>
                            <Code2 size={12} className="text-slate-300" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 하단: 코드 에디터 (전체 폭) */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="text-[13px] font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none"
              >
                {problem.languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <button
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <Play size={14} strokeWidth={2.5} />
                {submitting ? "제출 중..." : "제출"}
              </button>
            </div>
            <Editor
              height="420px"
              language={MONACO_LANGUAGE[language] ?? "plaintext"}
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs"
              options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
            />
          </div>

          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] px-6 py-5 min-h-[88px] flex items-center">
            {!activeSubmission && !loadError && (
              <p className="text-[13px] text-slate-400">채점 결과가 여기에 표시됩니다</p>
            )}
            {loadError && problem && (
              <p className="text-[13px] font-medium" style={{ color: "#FF3B30" }}>{loadError}</p>
            )}
            {activeSubmission && (
              <div className="flex items-center gap-3">
                {isPending(activeSubmission.result) && (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                )}
                {resultStyle && !isPending(activeSubmission.result) && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: resultStyle.color }} />
                )}
                <span className="text-[15px] font-semibold" style={{ color: resultStyle?.color ?? "#8E8E93" }}>
                  {resultStyle?.label ?? "채점중"}
                </span>
                {activeSubmission.statistic_info?.time_cost !== undefined && !isPending(activeSubmission.result) && (
                  <span className="text-[12px] text-slate-400">
                    {activeSubmission.statistic_info.time_cost}ms · {activeSubmission.statistic_info.memory_cost}KB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {viewing &&
        createPortal(
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-3 md:p-10">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewing(null)} />
            <div className="relative w-full max-w-4xl max-h-full bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-slate-900 truncate">
                    {viewing.memberName ? `${shortStudentId(viewing.memberStudentId)} ${viewing.memberName}` : "제출 코드"}
                    {viewing.mine && <span className="ml-1.5 text-[11px] font-medium text-indigo-500">(나)</span>}
                  </p>
                  <p className="text-[12px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                    <span style={{ color: (RESULT_STYLE[viewing.result] ?? { color: "#8E8E93" }).color }} className="font-semibold">
                      {(RESULT_STYLE[viewing.result] ?? { label: "-" }).label}
                    </span>
                    <span>{viewing.language}</span>
                    {viewing.statistic_info?.time_cost !== undefined && (
                      <span>{viewing.statistic_info.time_cost}ms · {viewing.statistic_info.memory_cost}KB</span>
                    )}
                    <span>{formatSubmitTime(viewing.create_time)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {viewing.mine && viewing.code && (
                    <button
                      onClick={() => {
                        if (!window.confirm("지금 에디터의 코드를 이 제출 코드로 바꿀까요?")) return;
                        if (viewing.language && problem?.languages.includes(viewing.language)) setLanguage(viewing.language);
                        setCode(viewing.code ?? "");
                        setViewing(null);
                      }}
                      className="h-8 px-3 rounded-lg text-[12px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                    >
                      에디터로 불러오기
                    </button>
                  )}
                  <button onClick={() => setViewing(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X size={16} />
                  </button>
                </div>
              </div>
              {viewLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
                </div>
              ) : (
                <Editor
                  height="60vh"
                  language={MONACO_LANGUAGE[viewing.language] ?? "plaintext"}
                  value={viewing.code ?? ""}
                  theme="vs"
                  options={{ readOnly: true, domReadOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
