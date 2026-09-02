import { api } from "../../../api/axios";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock, Send } from "lucide-react";

type PlanFields = {
  memo: string;
  planGoal: string;
  planSchedule: string;
  planTeamRoles: string;
  planBudget: string;
  planNotes: string;
};

const emptyFields: PlanFields = {
  memo: "",
  planGoal: "",
  planSchedule: "",
  planTeamRoles: "",
  planBudget: "",
  planNotes: "",
};

const isSubmittedStatus = (status?: string) => status === "SUBMITTED" || status === "제출완료";

// 총회 "계획서"(3월/9월) 전용 웹 작성 에디터. 섹션별로 나뉜 고정 양식 + 타이핑 멈추면
// 자동으로 임시저장(작성 중 날아가는 것 방지) + 완료되면 "제출 확정" 버튼으로 팀에 동기화.
export const AssemblyPlanEditor = ({
  loginId,
  report,
  disabled,
  onSaved,
  onRequestClose,
}: {
  loginId: string;
  report: any;
  disabled: boolean;
  onSaved: () => void;
  onRequestClose: () => void;
}) => {
  const [fields, setFields] = useState<PlanFields>({
    memo: report.memo || "",
    planGoal: report.planGoal || "",
    planSchedule: report.planSchedule || "",
    planTeamRoles: report.planTeamRoles || "",
    planBudget: report.planBudget || "",
    planNotes: report.planNotes || "",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const lastSavedRef = useRef(JSON.stringify(fields));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef<string>(report.id?.toString() || "0");

  const buildPayload = (f: PlanFields) => ({
    loginId,
    reportId: reportIdRef.current.includes("temp") ? "0" : reportIdRef.current,
    year: report.year,
    semester: report.semester,
    month: report.month,
    memo: f.memo,
    planGoal: f.planGoal,
    planSchedule: f.planSchedule,
    planTeamRoles: f.planTeamRoles,
    planBudget: f.planBudget,
    planNotes: f.planNotes,
  });

  const saveNow = async (f: PlanFields) => {
    const snapshot = JSON.stringify(f);
    if (snapshot === lastSavedRef.current) return;
    setSaveState("saving");
    try {
      const res = await api.post("/assembly/plan/save", buildPayload(f));
      if (res.data?.id) reportIdRef.current = res.data.id.toString();
      lastSavedRef.current = snapshot;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  // 타이핑 멈추면 1.2초 뒤 자동저장
  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNow(fieldsRef.current);
    }, 1200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, disabled]);

  // 화면을 벗어날 때(모달 닫기 등) 마지막 내용을 놓치지 않도록 즉시 저장
  useEffect(() => {
    return () => {
      if (!disabled) saveNow(fieldsRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof PlanFields) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleClose = () => {
    if (!disabled) saveNow(fieldsRef.current);
    onRequestClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/assembly/plan/submit", buildPayload(fieldsRef.current));
      lastSavedRef.current = JSON.stringify(fieldsRef.current);
      alert("계획서 제출이 완료되었습니다! 🎉");
      onSaved();
      onRequestClose();
    } catch (e: any) {
      alert(`제출 실패: ${e.response?.data?.message || e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const saveIndicator = () => {
    if (disabled) return null;
    if (saveState === "saving") return <span className="flex items-center gap-1 text-slate-400"><Loader2 size={12} className="animate-spin" /> 저장 중...</span>;
    if (saveState === "saved") return <span className="flex items-center gap-1 text-indigo-500"><Check size={12} /> 자동 저장됨</span>;
    if (saveState === "error") return <span className="text-pink-500">저장 실패 · 다시 시도합니다</span>;
    return <span className="text-slate-300">작성하면 자동으로 저장됩니다</span>;
  };

  const sections: { key: keyof PlanFields; label: string; placeholder: string; required?: boolean }[] = [
    { key: "planGoal", label: "목표", placeholder: "이번 프로젝트로 이루고자 하는 목표를 적어주세요.", required: true },
    { key: "planSchedule", label: "추진 일정", placeholder: "예: 3월 기획, 4월 개발, 5월 테스트, 6월 발표", required: true },
    { key: "planTeamRoles", label: "팀 구성 및 역할 분담", placeholder: "팀원 이름과 각자 맡은 역할을 적어주세요." },
    { key: "planBudget", label: "예산 계획", placeholder: "필요한 예산이 있다면 항목별로 적어주세요. 없으면 비워두어도 됩니다." },
    { key: "planNotes", label: "기타 참고사항", placeholder: "그 외 자유롭게 남기고 싶은 내용을 적어주세요." },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">한 줄 요약</p>
          </div>
          <input
            type="text"
            value={fields.memo}
            onChange={update("memo")}
            disabled={disabled}
            placeholder="목록에 표시될 짧은 제목 (예: OO팀 1학기 계획서)"
            className="w-full p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs md:text-sm disabled:opacity-50"
          />
        </div>
        <span className="text-[10px] md:text-[11px] font-bold shrink-0 ml-3 mt-6">{saveIndicator()}</span>
      </div>

      {disabled && (
        <div className="mb-6 p-3 md:p-4 bg-slate-900 rounded-xl md:rounded-2xl border border-slate-800 flex items-center gap-2 md:gap-3 text-white">
          <Lock size={16} className="text-indigo-400 shrink-0" />
          <p className="text-xs font-bold">현재 제출 및 수정 가능 기간이 아닙니다.</p>
        </div>
      )}

      <div className="space-y-5 mb-8">
        {sections.map((s) => (
          <div key={s.key}>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 ml-1 mb-1.5 uppercase tracking-widest">
              {s.label}{s.required && <span className="text-indigo-400"> *</span>}
            </p>
            <textarea
              value={fields[s.key]}
              onChange={update(s.key)}
              disabled={disabled}
              placeholder={s.placeholder}
              className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs md:text-sm min-h-[80px] md:min-h-[100px] disabled:opacity-50 resize-none"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={handleClose} className="flex-1 py-3.5 md:py-5 bg-slate-50 text-slate-500 rounded-xl md:rounded-2xl font-bold text-xs md:text-base hover:bg-slate-100 transition-all">
          닫기
        </button>
        {!disabled && (
          <button
            onClick={handleSubmit}
            disabled={submitting || !fields.planGoal.trim() || !fields.planSchedule.trim()}
            className={`flex-[2] py-3.5 md:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-base transition-all flex items-center justify-center gap-2 ${
              !submitting && fields.planGoal.trim() && fields.planSchedule.trim()
                ? "bg-indigo-600 text-white shadow-xl"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
            {isSubmittedStatus(report.status) ? "제출 내용 다시 확정" : "제출 확정"}
          </button>
        )}
      </div>
    </div>
  );
};
