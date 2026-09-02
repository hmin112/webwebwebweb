import { api } from "../../../api/axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, Loader2, Lock, Plus, Send, Target, ListChecks,
  Route, Users, Link2, StickyNote, X, UserPlus,
} from "lucide-react";

type Row = Record<string, string>;
type RoadmapItem = { title: string; startDate: string; endDate: string; detail: string };
type RoleRow = { loginId: string; name: string; role: string; duties: string };

type PlanState = {
  memo: string;
  planOverview: string;
  planGoals: string[];
  planRoadmapItems: RoadmapItem[];
  planRoles: RoleRow[];
  planLinks: Row[];
  planNotes: string;
};

const MIN_GOALS = 2;
const MAX_GOALS = 10;

const isSubmittedStatus = (status?: string) => status === "SUBMITTED" || status === "제출완료";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.length === 8) return strId.substring(2, 4);
  return strId;
};

const emptyRow = (keys: string[]): Row => Object.fromEntries(keys.map((k) => [k, ""]));

// 총회 "계획서"(3월/9월) 전용 웹 작성 페이지. 상단 왼쪽 사이드바(총회 탭 메뉴)는 그대로 둔 채
// 메인 영역만 이 페이지로 전환된다(MemberDetailTab과 동일한 방식).
export const AssemblyPlanPage = ({
  loginId,
  report,
  onBack,
}: {
  loginId: string;
  report: any;
  onBack: () => void;
}) => {
  const disabled = !report.isWithinPeriod;

  const [state, setState] = useState<PlanState>({
    memo: report.memo || "",
    planOverview: report.planOverview || "",
    planGoals: report.planGoals && report.planGoals.length >= MIN_GOALS ? report.planGoals : ["", ""],
    planRoadmapItems: report.planRoadmapItems || [],
    planRoles: report.planRoles || [],
    planLinks: report.planLinks && report.planLinks.length > 0 ? report.planLinks : [{ label: "Git", url: "" }, { label: "Notion", url: "" }],
    planNotes: report.planNotes || "",
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[] | null>(null); // null=로딩중, []=팀 없음(개인), [...]=팀원 목록

  const stateRef = useRef(state);
  stateRef.current = state;
  const lastSavedRef = useRef(JSON.stringify(state));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef<string>(report.id?.toString() || "0");

  // 이번 학기 팀 프로젝트 소속 여부 + 팀원 프로필 조회 (역할 섹션 표시/자동 채우기용)
  useEffect(() => {
    if (!loginId) return;
    api.get("/teams/my", { params: { loginId, year: report.year, semester: report.semester } })
      .then((res) => {
        const team = res.data?.team;
        const accepted = team?.members?.filter((m: any) => m.status === "ACCEPTED") ?? [];
        setTeamMembers(accepted);
      })
      .catch(() => setTeamMembers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 팀 정보가 로드됐고, 아직 저장된 역할 데이터가 없으면 팀원 목록으로 한 번 자동 채움
  useEffect(() => {
    if (!teamMembers || teamMembers.length === 0) return;
    if (stateRef.current.planRoles.length > 0) return;
    setState((p) => ({
      ...p,
      planRoles: teamMembers.map((m: any) => ({ loginId: m.loginId, name: m.name, role: "", duties: "" })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamMembers]);

  const buildPayload = (s: PlanState) => ({
    loginId,
    reportId: reportIdRef.current.includes("temp") ? "0" : reportIdRef.current,
    year: report.year,
    semester: report.semester,
    month: report.month,
    memo: s.memo,
    planOverview: s.planOverview,
    planGoals: s.planGoals.filter((g) => g.trim()),
    planRoadmapItems: s.planRoadmapItems.filter((r) => r.title?.trim() || r.startDate || r.endDate || r.detail?.trim()),
    planRoles: s.planRoles.filter((r) => r.name?.trim() || r.role?.trim() || r.duties?.trim()),
    planLinks: s.planLinks.filter((r) => r.label?.trim() || r.url?.trim()),
    planNotes: s.planNotes,
  });

  const saveNow = async (s: PlanState) => {
    const snapshot = JSON.stringify(s);
    if (snapshot === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await api.post("/assembly/plan/save", buildPayload(s));
      if (res.data?.id) reportIdRef.current = res.data.id.toString();
      lastSavedRef.current = snapshot;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNow(stateRef.current), 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, disabled]);

  useEffect(() => {
    return () => {
      if (!disabled) saveNow(stateRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = () => {
    if (!disabled) saveNow(stateRef.current);
    onBack();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/assembly/plan/submit", buildPayload(stateRef.current));
      lastSavedRef.current = JSON.stringify(stateRef.current);
      alert("계획서 제출이 완료되었습니다! 🎉");
      onBack();
    } catch (e: any) {
      alert(`제출 실패: ${e.response?.data?.message || e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    state.memo.trim() &&
    state.planOverview.trim() &&
    state.planGoals.filter((g) => g.trim()).length >= MIN_GOALS &&
    state.planRoadmapItems.length > 0;
  const showRoleSection = (teamMembers && teamMembers.length > 0) || state.planRoles.length > 0;

  const saveIndicator = () => {
    if (disabled) return null;
    if (saveState === "saving") return <span className="flex items-center gap-1 text-slate-400"><Loader2 size={12} className="animate-spin" /> 저장 중...</span>;
    if (saveState === "saved") return <span className="flex items-center gap-1 text-indigo-500"><Check size={12} /> 자동 저장됨</span>;
    if (saveState === "error") return <span className="text-pink-500">저장 실패 · 다시 시도합니다</span>;
    return <span className="text-slate-300">작성하면 자동으로 저장됩니다</span>;
  };

  // --- 핵심 목표 (최소 2개, 최대 10개) ---
  const updateGoal = (i: number, value: string) => setState((p) => ({ ...p, planGoals: p.planGoals.map((g, idx) => (idx === i ? value : g)) }));
  const addGoal = () => {
    if (state.planGoals.length >= MAX_GOALS) return;
    setState((p) => ({ ...p, planGoals: [...p.planGoals, ""] }));
  };
  const removeGoal = (i: number) => {
    if (state.planGoals.length <= MIN_GOALS) return;
    setState((p) => ({ ...p, planGoals: p.planGoals.filter((_, idx) => idx !== i) }));
  };

  // --- 역할 및 담당 ---
  const updateRole = (i: number, key: keyof RoleRow, value: string) =>
    setState((p) => ({ ...p, planRoles: p.planRoles.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)) }));
  const removeRole = (i: number) => setState((p) => ({ ...p, planRoles: p.planRoles.filter((_, idx) => idx !== i) }));
  const addExternalMember = () => setState((p) => ({ ...p, planRoles: [...p.planRoles, { loginId: "", name: "", role: "", duties: "" }] }));
  const findTeamMember = (loginIdOf: string) => teamMembers?.find((m: any) => m.loginId === loginIdOf);

  // --- 로드맵 ---
  const [newRoadmap, setNewRoadmap] = useState({ title: "", startDate: "", endDate: "" });
  const addRoadmapItem = () => {
    if (!newRoadmap.title.trim() || !newRoadmap.startDate || !newRoadmap.endDate) {
      alert("제목, 시작일, 종료일을 모두 입력해주세요.");
      return;
    }
    if (newRoadmap.startDate > newRoadmap.endDate) {
      alert("종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }
    setState((p) => ({ ...p, planRoadmapItems: [...p.planRoadmapItems, { ...newRoadmap, detail: "" }] }));
    setNewRoadmap({ title: "", startDate: "", endDate: "" });
  };
  const removeRoadmapItem = (i: number) => setState((p) => ({ ...p, planRoadmapItems: p.planRoadmapItems.filter((_, idx) => idx !== i) }));
  const updateRoadmapDetail = (i: number, detail: string) =>
    setState((p) => ({ ...p, planRoadmapItems: p.planRoadmapItems.map((r, idx) => (idx === i ? { ...r, detail } : r)) }));

  const roadmapRange = useMemo(() => {
    const times = state.planRoadmapItems
      .flatMap((r) => [r.startDate, r.endDate])
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t));
    if (times.length === 0) return null;
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { min, span: Math.max(max - min, 1000 * 60 * 60 * 24) };
  }, [state.planRoadmapItems]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-24 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={handleBack} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 font-bold text-xs md:text-sm transition-colors">
          <ArrowLeft size={16} /> 마이 페이지로
        </button>
        <span className="text-[10px] md:text-[11px] font-bold">{saveIndicator()}</span>
      </div>

      <div className="mb-8">
        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] md:text-[10px] font-bold rounded-md uppercase border border-indigo-100">
          {report.month}월 계획서
        </span>
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mt-2">
          {isSubmittedStatus(report.status) ? "계획서 수정" : "계획서 작성"}
        </h1>
      </div>

      {disabled && (
        <div className="mb-8 p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 text-white">
          <Lock size={16} className="text-indigo-400 shrink-0" />
          <p className="text-xs font-bold">현재 제출 및 수정 가능 기간이 아닙니다. (읽기 전용)</p>
        </div>
      )}

      <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm p-5 md:p-10 space-y-10">
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote size={14} className="text-indigo-500" />
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
              프로젝트 명<span className="text-indigo-400"> *</span>
            </p>
          </div>
          <input
            type="text"
            value={state.memo}
            onChange={(e) => setState((p) => ({ ...p, memo: e.target.value }))}
            disabled={disabled}
            placeholder="예: 동아리 웹 프로젝트"
            className="w-full p-3.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm disabled:opacity-50"
          />
        </section>

        <section>
          <SectionHeader icon={<Target size={14} />} label="배경 및 목표 개요" required />
          <textarea
            value={state.planOverview}
            onChange={(e) => setState((p) => ({ ...p, planOverview: e.target.value }))}
            disabled={disabled}
            placeholder="이 프로젝트를 왜 하는지, 무엇을 이루고 싶은지 자유롭게 적어주세요."
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm min-h-[110px] disabled:opacity-50 resize-none"
          />
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={<ListChecks size={14} />} label={`핵심 목표 (${state.planGoals.length}/${MAX_GOALS})`} required noMargin />
          </div>
          <div className="space-y-2">
            {state.planGoals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-50 text-indigo-500 text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                <input
                  value={goal}
                  onChange={(e) => updateGoal(i, e.target.value)}
                  disabled={disabled}
                  placeholder="예: 지문인식 도어락 웹 원격 제어 구현"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm disabled:opacity-50"
                />
                {!disabled && state.planGoals.length > MIN_GOALS && (
                  <button onClick={() => removeGoal(i)} className="text-slate-300 hover:text-red-500 shrink-0">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!disabled && state.planGoals.length < MAX_GOALS && (
            <button onClick={addGoal} className="flex items-center gap-1 mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700">
              <Plus size={13} /> 목표 추가
            </button>
          )}
          <p className="text-[10px] text-slate-300 mt-1.5">최소 {MIN_GOALS}개, 최대 {MAX_GOALS}개까지 추가할 수 있어요.</p>
        </section>

        {/* 로드맵 */}
        <section>
          <SectionHeader icon={<Route size={14} />} label="로드맵" required />
          <p className="text-[10px] text-slate-300 -mt-2 mb-4">최소 1개 이상 등록해야 제출할 수 있어요.</p>

          {roadmapRange && state.planRoadmapItems.length > 0 && (
            <div className="mb-5 space-y-3">
              {state.planRoadmapItems.map((item, i) => {
                const s = new Date(item.startDate).getTime();
                const e = new Date(item.endDate).getTime();
                const leftPct = isNaN(s) ? 0 : ((s - roadmapRange.min) / roadmapRange.span) * 100;
                const widthPct = isNaN(s) || isNaN(e) ? 100 : Math.max(((e - s) / roadmapRange.span) * 100, 2.5);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] md:text-xs font-bold text-slate-700 truncate">{item.title || `일정 ${i + 1}`}</span>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{item.startDate} ~ {item.endDate}</span>
                    </div>
                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!disabled && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_auto] gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mb-4">
              <input
                value={newRoadmap.title}
                onChange={(e) => setNewRoadmap((p) => ({ ...p, title: e.target.value }))}
                placeholder="일정 제목 (예: 시스템 설계)"
                className="px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm font-medium min-w-0"
              />
              <input
                type="date"
                value={newRoadmap.startDate}
                onChange={(e) => setNewRoadmap((p) => ({ ...p, startDate: e.target.value }))}
                className="px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm font-medium min-w-0"
              />
              <input
                type="date"
                value={newRoadmap.endDate}
                onChange={(e) => setNewRoadmap((p) => ({ ...p, endDate: e.target.value }))}
                className="px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm font-medium min-w-0"
              />
              <button onClick={addRoadmapItem} className="flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0">
                <Plus size={13} /> 추가
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {state.planRoadmapItems.map((item, i) => (
              <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800">{item.title || `일정 ${i + 1}`}</span>
                    <span className="text-[10px] text-slate-400 ml-2">{item.startDate} ~ {item.endDate}</span>
                  </div>
                  {!disabled && (
                    <button onClick={() => removeRoadmapItem(i)} className="text-slate-300 hover:text-red-500 shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <textarea
                  value={item.detail}
                  onChange={(e) => updateRoadmapDetail(i, e.target.value)}
                  disabled={disabled}
                  placeholder="이 기간에 할 일을 자세히 적어주세요."
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium disabled:opacity-50 resize-none min-h-[60px]"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 역할 및 담당 — 이번 학기 팀 프로젝트일 때만 노출 */}
        {showRoleSection && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={<Users size={14} />} label="역할 및 담당" noMargin />
            </div>
            <div className="space-y-2.5">
              {state.planRoles.map((row, i) => {
                const member = row.loginId ? findTeamMember(row.loginId) : null;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                      {member?.profileImage ? (
                        <img src={member.profileImage} alt={row.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-xs">{(row.name || "?")[0]}</div>
                      )}
                    </div>
                    {row.loginId ? (
                      <span className="w-24 md:w-28 shrink-0 text-xs font-bold text-slate-800 truncate">
                        {formatStudentId(member?.studentId)} {member?.name || row.name}
                      </span>
                    ) : (
                      <input
                        value={row.name}
                        onChange={(e) => updateRole(i, "name", e.target.value)}
                        disabled={disabled}
                        placeholder="이름"
                        className="w-24 md:w-28 shrink-0 px-2.5 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium disabled:opacity-50 min-w-0"
                      />
                    )}
                    <input
                      value={row.role}
                      onChange={(e) => updateRole(i, "role", e.target.value)}
                      disabled={disabled}
                      placeholder="역할 (예: 팀장)"
                      className="flex-1 px-2.5 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium disabled:opacity-50 min-w-0"
                    />
                    <input
                      value={row.duties}
                      onChange={(e) => updateRole(i, "duties", e.target.value)}
                      disabled={disabled}
                      placeholder="담당 업무"
                      className="flex-1 px-2.5 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium disabled:opacity-50 min-w-0"
                    />
                    {!disabled && (
                      <button onClick={() => removeRole(i)} className="text-slate-300 hover:text-red-500 shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!disabled && (
              <button onClick={addExternalMember} className="flex items-center gap-1 mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700">
                <UserPlus size={13} /> 팀원 추가 (동아리 외부인 포함)
              </button>
            )}
          </section>
        )}

        {/* 관련 링크 */}
        <DynamicTableSection
          icon={<Link2 size={14} />}
          label="관련 링크"
          addLabel="링크 추가"
          rows={state.planLinks}
          disabled={disabled}
          fields={[
            { key: "label", label: "이름", placeholder: "예: Git, Notion" },
            { key: "url", label: "링크", placeholder: "https://..." },
          ]}
          onChange={(rows) => setState((p) => ({ ...p, planLinks: rows }))}
        />

        <section>
          <SectionHeader icon={<StickyNote size={14} />} label="기타 참고사항" />
          <textarea
            value={state.planNotes}
            onChange={(e) => setState((p) => ({ ...p, planNotes: e.target.value }))}
            disabled={disabled}
            placeholder="그 외 자유롭게 남기고 싶은 내용을 적어주세요."
            className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm min-h-[90px] disabled:opacity-50 resize-none"
          />
        </section>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={handleBack} className="flex-1 py-4 md:py-5 bg-white border border-slate-100 text-slate-500 rounded-2xl font-bold text-sm md:text-base hover:bg-slate-50 transition-all shadow-sm">
          닫기
        </button>
        {!disabled && (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className={`flex-[2] py-4 md:py-5 rounded-2xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
              !submitting && canSubmit ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
            {isSubmittedStatus(report.status) ? "제출 내용 다시 확정" : "제출 확정"}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ icon, label, required, noMargin }: { icon: React.ReactNode; label: string; required?: boolean; noMargin?: boolean }) => (
  <div className={`flex items-center gap-1.5 ${noMargin ? "" : "mb-3"}`}>
    <span className="text-indigo-500">{icon}</span>
    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
      {label}{required && <span className="text-indigo-400"> *</span>}
    </p>
  </div>
);

const DynamicTableSection = ({
  icon,
  label,
  addLabel,
  fields,
  rows,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  addLabel: string;
  fields: { key: string; label: string; placeholder?: string }[];
  rows: Row[];
  disabled: boolean;
  onChange: (rows: Row[]) => void;
}) => {
  const gridClass = fields.length === 3 ? "sm:grid-cols-3" : fields.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";

  const updateCell = (idx: number, key: string, value: string) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };
  const addRow = () => onChange([...rows, emptyRow(fields.map((f) => f.key))]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <section>
      <SectionHeader icon={icon} label={label} />
      <div className="space-y-2.5">
        {rows.map((row, idx) => (
          <div key={idx} className={`grid grid-cols-1 ${gridClass} gap-2 p-3 md:p-3.5 bg-slate-50 rounded-xl border border-slate-100 relative`}>
            {fields.map((f) => (
              <input
                key={f.key}
                value={row[f.key] || ""}
                onChange={(e) => updateCell(idx, f.key, e.target.value)}
                disabled={disabled}
                placeholder={f.placeholder || f.label}
                className="px-3 py-2 bg-white rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm font-medium disabled:opacity-50 min-w-0"
              />
            ))}
            {!disabled && rows.length > 1 && (
              <button
                onClick={() => removeRow(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center shadow-sm"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
      {!disabled && (
        <button onClick={addRow} className="flex items-center gap-1 mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700">
          <Plus size={13} /> {addLabel}
        </button>
      )}
    </section>
  );
};
