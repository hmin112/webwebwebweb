import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2, Users, Info } from "lucide-react";
import { api } from "../../../api/axios";
import { Button } from "../../../components/ui/button";

type StatusState = {
  active: boolean;
  isTarget: boolean;
  alreadyChecked: boolean;
  checkedCount: number;
  totalCount: number;
};

export const AttendanceMemberTab = ({ loginId }: { loginId: string }) => {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/attendance/status", { params: { loginId } });
      setStatus(res.data);
    } catch {
      // 폴링 중 일시적 오류는 조용히 무시 (다음 폴링에서 재시도)
    }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginId]);

  const handleSubmit = async () => {
    if (code.length !== 3 || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await api.post("/attendance/check-in", { loginId, code });
      const result = res.data;
      if (result.status === "success" || result.status === "already_checked") {
        setCode("");
        await fetchStatus();
      } else if (result.status === "wrong_code") {
        setErrorMsg("인증번호가 올바르지 않습니다.");
        setCode("");
      } else {
        setErrorMsg(result.message || "출석 처리 중 문제가 발생했습니다.");
        await fetchStatus();
      }
    } catch {
      setErrorMsg("출석 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!status) {
    return <div className="h-[400px]" />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl">
      <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-10">출석</h1>

      {!status.active && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6">
            <Info size={28} />
          </div>
          <p className="text-slate-400 font-bold">현재 진행 중인 출석이 없습니다.</p>
        </div>
      )}

      {status.active && !status.isTarget && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6">
            <Users size={28} />
          </div>
          <p className="text-slate-400 font-bold">이번 출석 대상자가 아닙니다.</p>
        </div>
      )}

      {status.active && status.isTarget && status.alreadyChecked && (
        <div className="bg-emerald-50 p-12 rounded-[3rem] border border-emerald-100 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-emerald-700 font-black text-lg">출석 완료되었습니다.</p>
          <p className="text-emerald-500 text-sm font-bold mt-2">
            {status.checkedCount} / {status.totalCount}명 출석
          </p>
        </div>
      )}

      {status.active && status.isTarget && !status.alreadyChecked && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
            <KeyRound size={28} />
          </div>
          <p className="text-slate-900 font-black text-lg mb-1">출석 인증번호를 입력해주세요</p>
          <p className="text-slate-400 text-sm font-medium mb-8">관리자 화면에 표시된 3자리 숫자를 입력하세요</p>

          <input
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
              setCode(v);
              setErrorMsg("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            inputMode="numeric"
            maxLength={3}
            placeholder="000"
            className="w-full text-center text-5xl font-black tracking-[0.3em] text-slate-900 bg-slate-50 rounded-2xl py-6 mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {errorMsg && <p className="text-red-500 font-bold text-sm mb-4">{errorMsg}</p>}

          <Button
            onClick={handleSubmit}
            disabled={code.length !== 3 || submitting}
            className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black text-lg"
          >
            확인
          </Button>
        </div>
      )}
    </motion.div>
  );
};
