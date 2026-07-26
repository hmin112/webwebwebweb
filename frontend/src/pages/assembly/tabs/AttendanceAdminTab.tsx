import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer, Users, CheckCircle2, History, X, ChevronLeft, ChevronRight,
  Upload, FileSpreadsheet, AlertTriangle, Download,
} from "lucide-react";
import { api } from "../../../api/axios";
import { Button } from "../../../components/ui/button";

type TargetStatus = {
  loginId: string;
  name: string;
  studentId: string;
  dept?: string;
  profileImage: string | null;
  checkedIn: boolean;
};

type AdminStatus = {
  sessionId: number | null;
  code: string | null;
  status: "NONE" | "ACTIVE" | "CLOSED";
  remainingSeconds: number;
  checkedCount: number;
  totalCount: number;
  targets: TargetStatus[];
};

type Problem = { row: number; name: string; reason: string };

type HistoryTarget = { name: string; studentId: string; dept?: string; profileImage: string | null; checkedIn: boolean };
type HistorySession = {
  sessionId: number;
  title: string;
  startedAt: string;
  closedAt: string;
  checkedCount: number;
  totalCount: number;
  targets: HistoryTarget[];
};

const APPLE_GREEN = "#34C759";

const formatStudentId = (id?: string | null) => {
  if (!id) return "";
  const strId = String(id).trim();
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

const avatarOf = (m: { profileImage?: string | null; name: string }) =>
  m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`;

const formatTime = (seconds: number) => {
  const s = Math.max(0, seconds);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

// 정사각형 아바타 그리드 — 카드마다 폭이 다른 flex-wrap 대신 고정 트랙 grid로 오와 열을 정확히 맞춘다
const AttendeeGrid = ({ items }: { items: (TargetStatus | HistoryTarget)[] }) => (
  <div className="grid gap-x-4 gap-y-7 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))]">
    {items.map((m, idx) => (
      <div key={("loginId" in m ? m.loginId : null) || idx} className="flex flex-col items-center gap-2 min-w-0">
        <div className="relative">
          <div
            className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
              m.checkedIn ? "ring-2" : "opacity-35 grayscale ring-1 ring-slate-200"
            }`}
            style={m.checkedIn ? ({ "--tw-ring-color": APPLE_GREEN } as CSSProperties) : undefined}
          >
            <img src={avatarOf(m)} className="w-full h-full object-cover" alt={m.name} />
          </div>
          {m.checkedIn && (
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
              style={{ backgroundColor: APPLE_GREEN }}
            >
              <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
            </div>
          )}
        </div>
        <p className="text-[11px] font-medium text-slate-700 leading-tight text-center truncate w-full">
          {formatStudentId(m.studentId)} {m.name}
        </p>
      </div>
    ))}
  </div>
);

export const AttendanceAdminTab = () => {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/admin/attendance/status");
      setStatus(res.data);
      setRemaining(res.data.remainingSeconds ?? 0);
    } catch {
      // 폴링 중 일시적 오류는 무시
    }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (status?.status === "ACTIVE") {
      tickRef.current = setInterval(() => setRemaining((prev) => Math.max(0, prev - 1)), 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [status?.status, status?.sessionId]);

  const handleStart = async () => {
    if (!file || starting) return;
    setStarting(true);
    setErrorMsg("");
    setProblems(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/admin/attendance/start", formData);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchStatus();
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.problems && data.problems.length > 0) {
        setProblems(data.problems);
        setErrorMsg(data.message || "대상자 명단에 문제가 있습니다");
      } else {
        setErrorMsg(data?.message || "출석 시작에 실패했습니다");
      }
    } finally {
      setStarting(false);
    }
  };

  const handleClose = async () => {
    if (!status?.sessionId) return;
    if (!window.confirm("출석을 종료할까요?")) return;
    try {
      await api.post(`/admin/attendance/${status.sessionId}/close`);
      await fetchStatus();
    } catch {
      alert("출석 종료 중 오류가 발생했습니다.");
    }
  };

  const openHistory = async () => {
    setSelectedSession(null);
    try {
      const res = await api.get("/admin/attendance/history");
      setHistory(res.data);
      setShowHistory(true);
    } catch {
      alert("출석 이력을 불러오는데 실패했습니다.");
    }
  };

  const handleDownload = async (session: HistorySession) => {
    try {
      const res = await api.get(`/admin/attendance/history/${session.sessionId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${session.title || "attendance"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("엑셀 다운로드에 실패했습니다.");
    }
  };

  const isActive = status?.status === "ACTIVE";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-[26px] font-semibold text-slate-900 tracking-[-0.01em]">출석 설정</h1>
        <button
          onClick={openHistory}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-4 py-2 rounded-full transition-colors"
        >
          <History size={15} /> 이력
        </button>
      </div>

      {!isActive && (
        <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-10 max-w-md">
          <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
            <Timer size={20} />
          </div>
          <h2 className="text-[19px] font-semibold text-slate-900 tracking-[-0.01em] mb-1.5">대상자 명단 업로드</h2>
          <p className="text-[13px] text-slate-400 leading-relaxed mb-7">
            "이름 / 학번 / 학과" 컬럼이 포함된 .xlsx 파일을 업로드하면 해당 인원을 대상으로 출석이 시작됩니다.
          </p>

          <label className="flex items-center gap-3.5 border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition-all mb-5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-slate-800 truncate">{file ? file.name : "엑셀 파일 선택"}</p>
              <p className="text-[12px] text-slate-400">.xlsx</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {errorMsg && (
            <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 mb-5">
              <div className="flex items-center gap-2 text-[13px] font-semibold mb-1.5" style={{ color: "#FF3B30" }}>
                <AlertTriangle size={14} /> {errorMsg}
              </div>
              {problems && problems.length > 0 && (
                <ul className="space-y-1 text-[12px] text-red-400 font-medium pl-1 max-h-40 overflow-y-auto">
                  {problems.map((p, i) => (
                    <li key={i}>
                      {p.row}행 · {p.name} — {p.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={!file || starting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 shadow-none"
          >
            <Upload size={16} /> {starting ? "시작하는 중…" : "출석 시작"}
          </Button>
        </div>
      )}

      {isActive && status && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-10 flex flex-col items-center justify-center text-center relative">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[13px] font-medium px-3 py-1.5 rounded-full">
                <Timer size={13} /> {formatTime(remaining)}
              </div>
              <p className="text-[12px] font-medium text-slate-400 uppercase tracking-[0.12em] mb-3">인증번호</p>
              <h2 className="text-[76px] font-semibold text-slate-900 leading-none tracking-[0.03em] tabular-nums">
                {status.code}
              </h2>
              <p className="text-[13px] text-slate-400 mt-5">
                {status.checkedCount} / {status.totalCount}명 출석
              </p>
              <button
                onClick={handleClose}
                className="mt-7 text-[13px] font-medium text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-full px-5 py-2 transition-colors"
              >
                출석 종료
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-9">
            <div className="flex items-center gap-2 mb-7">
              <Users size={16} className="text-slate-400" />
              <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-[0.08em]">실시간 출석 현황</h3>
            </div>
            <AttendeeGrid items={status.targets} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[82vh]"
            >
              <div className="px-7 py-5 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-10">
                {selectedSession ? (
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors -ml-1.5"
                  >
                    <ChevronLeft size={18} />
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <History size={15} />
                  </div>
                )}
                <h3 className="text-[16px] font-semibold text-slate-900 tracking-[-0.01em] flex-1 truncate">
                  {selectedSession ? selectedSession.title : "출석 이력"}
                </h3>
                {selectedSession && (
                  <button
                    onClick={() => handleDownload(selectedSession)}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 rounded-full transition-colors"
                  >
                    <Download size={13} /> 엑셀 다운로드
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-7">
                {!selectedSession && (
                  history.length === 0 ? (
                    <div className="text-center py-20 text-slate-300 font-medium flex flex-col items-center gap-3">
                      <History size={40} className="opacity-30" />
                      저장된 출석 기록이 없습니다
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((session) => (
                        <button
                          key={session.sessionId}
                          onClick={() => setSelectedSession(session)}
                          className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-[15px] font-medium text-slate-900 truncate">{session.title}</p>
                            <p className="text-[12px] text-slate-400 mt-0.5">
                              {(session.startedAt || "").slice(0, 10)} · {session.checkedCount} / {session.totalCount}명 출석
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )
                )}

                {selectedSession && <AttendeeGrid items={selectedSession.targets} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
