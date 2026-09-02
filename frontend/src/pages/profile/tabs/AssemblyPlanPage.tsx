import { api } from "../../../api/axios";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Lock, Plus, Send, Target, ListChecks, CalendarClock, Users, Wallet, StickyNote, X } from "lucide-react";

type Row = Record<string, string>;

type PlanState = {
  memo: string;
  planOverview: string;
  planGoals: string[];
  planTasks: Row[];
  planRoles: Row[];
  planBudgetItems: Row[];
  planNotes: string;
};

const isSubmittedStatus = (status?: string) => status === "SUBMITTED" || status === "제출완료";

const emptyRow = (keys: string[]): Row => Object.fromEntries(keys.map((k) => [k, ""]));

// 총회 "계획서"(3월/9월) 전용 웹 작성 페이지. 상단 왼쪽 사이드바(총회 탭 메뉴)는 그대로 둔 채
// 메인 영역만 이 페이지로 전환된다(MemberDetailTab과 동일한 방식). 섹션별 고정 양식 + 목표/작업/
// 역할/예산은 행을 자유롭게 추가·삭제할 수 있는 표 형태, 타이핑 멈추면 자동 저장.
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
    planGoals: report.planGoals && report.planGoals.length > 0 ? report.planGoals : [""],
    planTasks: report.planTasks && report.planTasks.length > 0 ? report.planTasks : [emptyRow(["task", "assignee", "deadline"])],
    planRoles: report.planRoles && report.planRoles.length > 0 ? report.planRoles : [emptyRow(["name", "role", "duties"])],
    planBudgetItems: report.planBudgetItems && report.planBudgetItems.length > 0 ? report.planBudgetItems : [emptyRow(["item", "amount", "note"])],
    planNotes: report.planNotes || "",
  });

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const lastSavedRef = useRef(JSON.stringify(state));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef<string>(report.id?.toString() || "0");

  const buildPayload = (s: PlanState) => ({
    loginId,
    reportId: reportIdRef.current.includes("temp") ? "0" : reportIdRef.current,
    year: report.year,
    semester: report.semester,
    month: report.month,
    memo: s.memo,
    planOverview: s.planOverview,
    planGoals: s.planGoals.filter((g) => g.trim()),
    planTasks: s.planTasks.filter((r) => r.task?.trim() || r.assignee?.trim() || r.deadline?.trim()),
    planRoles: s.planRoles.filter((r) => r.name?.trim() || r.role?.trim() || r.duties?.trim()),
    planBudgetItems: s.planBudgetItems.filter((r) => r.item?.trim() || r.amount?.trim() || r.note?.trim()),
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

  const canSubmit = state.planOverview.trim() && state.planGoals.some((g) => g.trim());

  const saveIndicator = () => {
    if (disabled) return null;
    if (saveState === "saving") return <span className="flex items-center gap-1 text-slate-400"><Loader2 size={12} className="animate-spin" /> 저장 중...</span>;
    if (saveState === "saved") return <span className="flex items-center gap-1 text-indigo-500"><Check size={12} /> 자동 저장됨</span>;
    if (saveState === "error") return <span className="text-pink-500">저장 실패 · 다시 시도합니다</span>;
    return <span className="text-slate-300">작성하면 자동으로 저장됩니다</span>;
  };

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
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">한 줄 요약</p>
          </div>
          <input
            type="text"
            value={state.memo}
            onChange={(e) => setState((p) => ({ ...p, memo: e.target.value }))}
            disabled={disabled}
            placeholder="목록에 표시될 짧은 제목 (예: OO팀 1학기 계획서)"
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
          <SectionHeader icon={<ListChecks size={14} />} label="핵심 목표" required />
          <div className="space-y-2">
            {state.planGoals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-50 text-indigo-500 text-[11px] font-black flex items-center justify-center">{i + 1}</span>
                <input
                  value={goal}
                  onChange={(e) => setState((p) => ({ ...p, planGoals: p.planGoals.map((g, idx) => (idx === i ? e.target.value : g)) }))}
                  disabled={disabled}
                  placeholder="예: 지문인식 도어락 웹 원격 제어 구현"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm disabled:opacity-50"
                />
                {!disabled && state.planGoals.length > 1 && (
                  <button onClick={() => setState((p) => ({ ...p, planGoals: p.planGoals.filter((_, idx) => idx !== i) }))} className="text-slate-300 hover:text-red-500 shrink-0">
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!disabled && (
            <button onClick={() => setState((p) => ({ ...p, planGoals: [...p.planGoals, ""] }))} className="flex items-center gap-1 mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700">
              <Plus size={13} /> 목표 추가
            </button>
          )}
        </section>

        <DynamicTableSection
          icon={<CalendarClock size={14} />}
          label="작업 및 일정"
          addLabel="작업 추가"
          rows={state.planTasks}
          disabled={disabled}
          fields={[
            { key: "task", label: "작업명", placeholder: "예: 웹 대시보드 개발" },
            { key: "assignee", label: "담당자", placeholder: "예: 김형민" },
            { key: "deadline", label: "기한", placeholder: "예: 4월 3주차" },
          ]}
          onChange={(rows) => setState((p) => ({ ...p, planTasks: rows }))}
        />

        <DynamicTableSection
          icon={<Users size={14} />}
          label="역할 및 담당"
          addLabel="팀원 추가"
          rows={state.planRoles}
          disabled={disabled}
          fields={[
            { key: "name", label: "이름", placeholder: "예: 김형민" },
            { key: "role", label: "역할", placeholder: "예: 팀장 / 백엔드" },
            { key: "duties", label: "담당 업무", placeholder: "예: 서버 설계, API 개발" },
          ]}
          onChange={(rows) => setState((p) => ({ ...p, planRoles: rows }))}
        />

        <DynamicTableSection
          icon={<Wallet size={14} />}
          label="예산 계획"
          addLabel="항목 추가"
          rows={state.planBudgetItems}
          disabled={disabled}
          fields={[
            { key: "item", label: "항목", placeholder: "예: 서버 호스팅비" },
            { key: "amount", label: "금액", placeholder: "예: 100,000원" },
            { key: "note", label: "비고", placeholder: "예: 3개월분" },
          ]}
          onChange={(rows) => setState((p) => ({ ...p, planBudgetItems: rows }))}
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

const SectionHeader = ({ icon, label, required }: { icon: React.ReactNode; label: string; required?: boolean }) => (
  <div className="flex items-center gap-1.5 mb-3">
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
