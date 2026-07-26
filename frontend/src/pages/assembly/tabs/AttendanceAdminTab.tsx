import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Timer, Users, CheckCircle, History, X, Calendar,
  Upload, FileSpreadsheet, AlertTriangle,
} from "lucide-react";
import { api } from "../../../api/axios";
import { Button } from "../../../components/ui/button";

type TargetStatus = {
  loginId: string;
  name: string;
  studentId: string;
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

const formatStudentId = (id?: string | null) => {
  if (!id) return "??";
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

export const AttendanceAdminTab = () => {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
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
      tickRef.current = setInterval(() => {
        setRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
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
        setErrorMsg(data.message || "대상자 명단에 문제가 있습니다.");
      } else {
        setErrorMsg(data?.message || "출석 시작에 실패했습니다.");
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
    try {
      const res = await api.get("/admin/attendance/history");
      setHistory(res.data);
      setShowHistory(true);
    } catch {
      alert("출석 이력을 불러오는데 실패했습니다.");
    }
  };

  const isActive = status?.status === "ACTIVE";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">출석 설정</h1>
        <Button
          onClick={openHistory}
          className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-6 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <History size={18} /> 출석 이력 확인
        </Button>
      </div>

      {!isActive && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm max-w-xl">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-8">
            <Timer size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">출석 대상자 명단 업로드</h2>
          <p className="text-slate-400 font-medium mb-8">
            "이름"/"아이디" 컬럼이 포함된 .xlsx 파일을 업로드하면 해당 인원을 대상으로 출석이 시작됩니다.
          </p>

          <label className="flex items-center gap-4 border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-indigo-300 transition-all mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{file ? file.name : "엑셀 파일 선택 (.xlsx)"}</p>
              <p className="text-xs text-slate-400 font-medium">클릭해서 파일을 선택하세요</p>
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
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
              <div className="flex items-center gap-2 text-red-600 font-black mb-2">
                <AlertTriangle size={18} /> {errorMsg}
              </div>
              {problems && problems.length > 0 && (
                <ul className="space-y-1 text-sm text-red-500 font-medium pl-2">
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
            className="w-full bg-indigo-600 text-white py-8 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-2"
          >
            <Upload size={20} /> {starting ? "시작하는 중..." : "출석 시작하기"}
          </Button>
        </div>
      )}

      {isActive && status && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-indigo-600 p-12 rounded-[3.5rem] text-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-8 right-8 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                <Timer size={18} />
                <span className="font-black text-lg">{formatTime(remaining)}</span>
              </div>
              <p className="text-indigo-200 font-bold uppercase mb-4 tracking-widest text-xs">Attendance Code</p>
              <h2 className="text-[120px] font-black leading-none tracking-tighter">{status.code}</h2>
              <Button
                onClick={handleClose}
                variant="ghost"
                className="mt-8 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-10 py-6 font-bold"
              >
                <CheckCircle size={18} className="mr-2" /> 출석 종료
              </Button>
            </div>

            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
              <p className="text-slate-400 font-black uppercase mb-6 tracking-widest text-xs">Attended Members</p>
              <div className="flex items-center gap-4">
                <span className="text-[100px] font-black text-slate-900 leading-none">{status.checkedCount}</span>
                <span className="text-2xl font-bold text-slate-300 mt-10">/ {status.totalCount}명</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[300px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="text-indigo-600" size={20} /> Live Board
              </h3>
            </div>
            <div className="flex flex-wrap gap-6 justify-start">
              <AnimatePresence>
                {status.targets.map((m) => (
                  <motion.div
                    key={m.loginId}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="relative">
                      <div
                        className={`w-16 h-16 rounded-2xl overflow-hidden shadow-sm transition-all ${
                          m.checkedIn
                            ? "border-2 border-emerald-400"
                            : "border-2 border-slate-100 opacity-40 grayscale"
                        }`}
                      >
                        <img src={avatarOf(m)} className="w-full h-full object-cover" alt={m.name} />
                      </div>
                      {m.checkedIn && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-900 leading-none mb-1">
                        {formatStudentId(m.studentId)} {m.name}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <History size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">지난 출석 기록</h3>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {history.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold flex flex-col items-center gap-4">
                    <History size={48} className="opacity-20" />
                    저장된 출석 기록이 없습니다.
                  </div>
                ) : (
                  history.map((session: any) => (
                    <div
                      key={session.sessionId}
                      className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 group hover:border-indigo-200 transition-all"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                        <div className="flex items-center gap-8">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                              Session
                            </span>
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                              <Calendar size={18} className="text-slate-400" />
                              {session.title || (session.startedAt || "").slice(0, 10)}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Attendance
                            </span>
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                              <Users size={18} className="text-slate-400" />
                              {session.checkedCount} / {session.totalCount}명
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {session.targets?.map((m: any, i: number) => (
                          <div
                            key={i}
                            className={`flex items-center gap-3 bg-white px-3 py-2.5 rounded-2xl border shadow-sm ${
                              m.checkedIn ? "border-emerald-100" : "border-slate-100 opacity-50"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-50">
                              <img src={avatarOf(m)} className="w-full h-full object-cover" alt={m.name} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-900 truncate">{m.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 tracking-tighter">
                                {formatStudentId(m.studentId)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
