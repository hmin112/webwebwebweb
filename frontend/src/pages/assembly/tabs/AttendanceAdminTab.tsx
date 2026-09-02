import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  Timer, Users, CheckCircle2, History, ChevronLeft, ChevronRight,
  Upload, FileSpreadsheet, AlertTriangle, Download, Trash2, MessageSquare,
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

type HistorySession = {
  sessionId: number;
  title: string;
  startedAt: string;
  closedAt: string;
  checkedCount: number;
  totalCount: number;
  targets: TargetStatus[];
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

// 정사각형 아바타 그리드 — 카드마다 폭이 다른 flex-wrap 대신 고정 트랙 grid로 오와 열을 정확히 맞춘다.
// sessionId가 주어지면 클릭으로 출석/미출석을 수기 토글할 수 있다(지각자 등 사후 정정용).
const AttendeeGrid = ({
  items,
  sessionId,
  onToggled,
}: {
  items: TargetStatus[];
  sessionId?: number;
  onToggled?: () => void;
}) => {
  const [pending, setPending] = useState<string | null>(null);

  const handleToggle = async (m: TargetStatus) => {
    if (!sessionId || pending) return;
    setPending(m.loginId);
    try {
      await api.put(`/admin/attendance/${sessionId}/targets/${m.loginId}`, { checkedIn: !m.checkedIn });
      onToggled?.();
    } catch {
      alert("출석 상태 변경에 실패했습니다.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid gap-x-4 gap-y-7 [grid-template-columns:repeat(auto-fill,minmax(72px,1fr))]">
      {items.map((m, idx) => (
        <button
          key={m.loginId || idx}
          type="button"
          disabled={!sessionId || pending === m.loginId}
          onClick={() => handleToggle(m)}
          className={`flex flex-col items-center gap-2 min-w-0 group ${sessionId ? "cursor-pointer" : "cursor-default"}`}
          title={sessionId ? (m.checkedIn ? "클릭하면 미출석으로 변경" : "클릭하면 출석으로 변경") : undefined}
        >
          <div className="relative">
            <div
              className={`w-14 h-14 rounded-2xl overflow-hidden transition-all ${
                m.checkedIn ? "ring-2" : "opacity-35 grayscale ring-1 ring-slate-200"
              } ${sessionId ? "group-hover:opacity-80 group-hover:ring-slate-400" : ""} ${pending === m.loginId ? "opacity-50" : ""}`}
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
        </button>
      ))}
    </div>
  );
};

const HistoryPanel = ({
  history,
  onDownload,
  onToggled,
  onDelete,
}: {
  history: HistorySession[];
  onDownload: (s: HistorySession) => void;
  onToggled: () => void;
  onDelete: (s: HistorySession) => Promise<void>;
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  // history prop이 갱신될 때마다 최신 상태를 다시 찾아옴 — 스냅샷을 들고 있지 않아서
  // 토글 직후에도 상세 화면이 즉시 최신 상태로 보인다.
  const selected = selectedId != null ? history.find((h) => h.sessionId === selectedId) ?? null : null;

  const handleDeleteClick = async () => {
    if (!selected || deleting) return;
    if (!window.confirm(`"${selected.title}" 출석 기록을 완전히 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`)) return;
    setDeleting(true);
    try {
      await onDelete(selected);
      setSelectedId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-7">
      <div className="flex items-center gap-3 mb-6">
        {selected ? (
          <button
            onClick={() => setSelectedId(null)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors -ml-1.5"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <History size={15} />
          </div>
        )}
        <h3 className="text-[15px] font-semibold text-slate-900 tracking-[-0.01em] flex-1 truncate">
          {selected ? selected.title : "출석 이력"}
        </h3>
        {selected && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(selected)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 rounded-full transition-colors"
            >
              <Download size={13} /> 엑셀 다운로드
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              className="flex items-center gap-1.5 text-[12px] font-medium disabled:opacity-50 px-3.5 py-1.5 rounded-full transition-colors"
              style={{ color: "#FF3B30" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,59,48,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Trash2 size={13} /> {deleting ? "삭제 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>

      {!selected &&
        (history.length === 0 ? (
          <div className="text-center py-14 text-slate-300 font-medium flex flex-col items-center gap-3">
            <History size={36} className="opacity-30" />
            <span className="text-[13px]">저장된 출석 기록이 없습니다</span>
          </div>
        ) : (
          <div className="space-y-1">
            {history.map((session) => (
              <button
                key={session.sessionId}
                onClick={() => setSelectedId(session.sessionId)}
                className="w-full flex items-center justify-between gap-4 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-slate-900 truncate">{session.title}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    {(session.startedAt || "").slice(0, 10)} · {session.checkedCount} / {session.totalCount}명 출석
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            ))}
          </div>
        ))}

      {selected && (
        <>
          <p className="text-[12px] text-slate-400 mb-5">항목을 클릭하면 출석/미출석을 수기로 정정할 수 있습니다</p>
          <AttendeeGrid items={selected.targets} sessionId={selected.sessionId} onToggled={onToggled} />
        </>
      )}
    </div>
  );
};

export const AttendanceAdminTab = () => {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [startMode, setStartMode] = useState<"excel" | "discord">("excel");
  const [messageId, setMessageId] = useState("");
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

  const fetchHistory = async () => {
    try {
      const res = await api.get("/admin/attendance/history");
      setHistory(res.data);
    } catch {
      // 조용히 무시 — 다음 갱신에서 재시도
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
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

  const handleStartFromDiscord = async () => {
    if (!messageId.trim() || starting) return;
    setStarting(true);
    setErrorMsg("");
    setProblems(null);
    try {
      const res = await api.post("/admin/attendance/start-from-discord", { messageId: messageId.trim() });
      setMessageId("");
      const skipped: string[] = res.data?.skippedReactors || [];
      await fetchStatus();
      if (skipped.length > 0) {
        alert(
          `출석이 시작되었습니다.\n\n다만 ✅ 반응을 남긴 사람 중 ${skipped.length}명은 웹사이트 회원과 매칭되지 않아 대상자에서 제외했습니다:\n${skipped.join(", ")}`
        );
      }
    } catch (e: any) {
      const data = e?.response?.data;
      setErrorMsg(data?.message || "출석 시작에 실패했습니다");
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
      await fetchHistory();
    } catch {
      alert("출석 종료 중 오류가 발생했습니다.");
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

  const handleDeleteHistory = async (session: HistorySession) => {
    try {
      await api.delete(`/admin/attendance/history/${session.sessionId}`);
      await fetchHistory();
    } catch {
      alert("출석 기록 삭제에 실패했습니다.");
    }
  };

  const isActive = status?.status === "ACTIVE";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1 className="text-[26px] font-semibold text-slate-900 tracking-[-0.01em] mb-8">출석 설정</h1>

      {!isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-10">
            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-6">
              <Timer size={20} />
            </div>
            <h2 className="text-[19px] font-semibold text-slate-900 tracking-[-0.01em] mb-1.5">대상자 명단으로 출석 시작</h2>

            <div className="flex items-center gap-1.5 bg-slate-100 rounded-full p-1 mb-6 w-fit">
              <button
                type="button"
                onClick={() => { setStartMode("excel"); setErrorMsg(""); setProblems(null); }}
                className={`flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
                  startMode === "excel" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                <FileSpreadsheet size={13} /> 엑셀 업로드
              </button>
              <button
                type="button"
                onClick={() => { setStartMode("discord"); setErrorMsg(""); setProblems(null); }}
                className={`flex items-center gap-1.5 text-[12.5px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
                  startMode === "discord" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                }`}
              >
                <MessageSquare size={13} /> 디스코드 메시지
              </button>
            </div>

            {startMode === "excel" ? (
              <>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
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
              </>
            ) : (
              <>
                <p className="text-[13px] text-slate-400 leading-relaxed mb-5">
                  디스코드에서 대상자 모집 메시지의 <b className="text-slate-500 font-semibold">메시지 ID</b>를 붙여넣으면,
                  그 메시지에 ✅ 반응을 남긴 사람들을 대상으로 출석이 시작됩니다.
                  <br />
                  <span className="text-slate-300">(디스코드 개발자 모드 켜기 → 메시지 우클릭 → "메시지 ID 복사")</span>
                </p>
                <div className="flex items-center gap-3.5 border border-slate-200 rounded-2xl p-4 mb-5 focus-within:border-slate-300">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="메시지 ID 붙여넣기 (예: 1234567890123456789)"
                    className="min-w-0 flex-1 text-[14px] font-medium text-slate-800 outline-none placeholder:text-slate-300 placeholder:font-normal"
                  />
                </div>
              </>
            )}

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

            {startMode === "excel" ? (
              <Button
                onClick={handleStart}
                disabled={!file || starting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 shadow-none"
              >
                <Upload size={16} /> {starting ? "시작하는 중…" : "출석 시작"}
              </Button>
            ) : (
              <Button
                onClick={handleStartFromDiscord}
                disabled={!messageId.trim() || starting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 shadow-none"
              >
                <MessageSquare size={16} /> {starting ? "시작하는 중…" : "출석 시작"}
              </Button>
            )}
          </div>

          <HistoryPanel history={history} onDownload={handleDownload} onToggled={fetchHistory} onDelete={handleDeleteHistory} />
        </div>
      )}

      {isActive && status && (
        <div className="space-y-6">
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

          <div className="bg-white rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.05)] p-9">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-[0.08em]">실시간 출석 현황</h3>
              </div>
            </div>
            <p className="text-[12px] text-slate-400 mb-6">지각자 등은 항목을 클릭해 수기로 출석 처리할 수 있습니다</p>
            <AttendeeGrid items={status.targets} sessionId={status.sessionId ?? undefined} onToggled={fetchStatus} />
          </div>

          <HistoryPanel history={history} onDownload={handleDownload} onToggled={fetchHistory} onDelete={handleDeleteHistory} />
        </div>
      )}
    </motion.div>
  );
};
