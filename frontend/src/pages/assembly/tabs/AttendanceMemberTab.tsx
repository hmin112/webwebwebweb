import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Info, Users } from "lucide-react";
import { api } from "../../../api/axios";

type StatusState = {
  active: boolean;
  isTarget: boolean;
  alreadyChecked: boolean;
  checkedCount: number;
  totalCount: number;
};

const APPLE_GREEN = "#34C759";

export const AttendanceMemberTab = ({ loginId }: { loginId: string }) => {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [digits, setDigits] = useState(["", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

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

  useEffect(() => {
    if (status?.active && status.isTarget && !status.alreadyChecked) {
      inputRefs[0].current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.active, status?.isTarget, status?.alreadyChecked]);

  const resetDigits = () => {
    setDigits(["", "", ""]);
    setTimeout(() => inputRefs[0].current?.focus(), 10);
  };

  const submitCode = async (code: string) => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await api.post("/attendance/check-in", { loginId, code });
      const result = res.data;
      if (result.status === "success" || result.status === "already_checked") {
        await fetchStatus();
      } else if (result.status === "wrong_code") {
        setShake(true);
        setTimeout(() => setShake(false), 420);
        resetDigits();
        setErrorMsg("인증번호가 올바르지 않습니다");
      } else {
        setErrorMsg(result.message || "출석 처리 중 문제가 발생했습니다");
        resetDigits();
        await fetchStatus();
      }
    } catch {
      setErrorMsg("출석 처리 중 오류가 발생했습니다");
      resetDigits();
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setErrorMsg("");
    if (v && i < 2) inputRefs[i + 1].current?.focus();
    if (v && i === 2 && next.every((d) => d !== "")) {
      submitCode(next.join(""));
    }
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    if (digits[i]) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
    } else if (i > 0) {
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
      inputRefs[i - 1].current?.focus();
    }
  };

  if (!status) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[360px]"
      >
        <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.06)] px-8 py-10 text-center">
          {!status.active && (
            <>
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-5">
                <Info size={20} strokeWidth={2} />
              </div>
              <p className="text-[15px] font-medium text-slate-500">현재 진행 중인 출석이 없습니다</p>
            </>
          )}

          {status.active && !status.isTarget && (
            <>
              <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-5">
                <Users size={20} strokeWidth={2} />
              </div>
              <p className="text-[15px] font-medium text-slate-500">이번 출석 대상자가 아닙니다</p>
            </>
          )}

          {status.active && status.isTarget && status.alreadyChecked && (
            <>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white mx-auto mb-5"
                style={{ backgroundColor: APPLE_GREEN }}
              >
                <CheckCircle2 size={26} strokeWidth={2.2} />
              </div>
              <p className="text-[19px] font-semibold text-slate-900 tracking-[-0.01em]">출석 완료</p>
              <p className="text-[13px] text-slate-400 mt-1.5">
                {status.checkedCount} / {status.totalCount}명 출석
              </p>
            </>
          )}

          {status.active && status.isTarget && !status.alreadyChecked && (
            <>
              <p className="text-[19px] font-semibold text-slate-900 tracking-[-0.01em] mb-1.5">인증번호 입력</p>
              <p className="text-[13px] text-slate-400 mb-8">화면에 표시된 3자리 숫자를 입력하세요</p>

              <motion.div
                animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center gap-3 mb-4"
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    inputMode="numeric"
                    maxLength={1}
                    disabled={submitting}
                    autoFocus={i === 0}
                    className="w-16 h-[72px] text-center text-[28px] font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all duration-150 focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06] disabled:opacity-50"
                  />
                ))}
              </motion.div>

              <div className="h-5">
                {errorMsg && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] font-medium"
                    style={{ color: "#FF3B30" }}
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
