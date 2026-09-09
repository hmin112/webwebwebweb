import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, ChevronLeft, ChevronRight, Save, Loader2, Search, X,
  CheckCircle2, Circle, Send, Users, Coins, MessageSquare, UserPlus, Trash2, ClipboardList,
} from "lucide-react";
import { api } from "../../../api/axios";

// 학기 운영월 — 앱의 다른 월별 기능(제출/자료, 총회 배너)과 동일한 기준
const ACTIVE_MONTHS = [3, 4, 5, 6, 9, 10, 11, 12];

interface FeeMember {
  loginId: string;
  name: string;
  studentId: string;
  userStatus: string;
  discordTag: string | null;
  paid: boolean;
  // 지금은 회비 대상이 아닌 사람(탈퇴/휴학 등) — 그 달 기록은 그대로 남겨두고 표시만 구분
  former: boolean;
}

interface FeeMonthData {
  year: number;
  month: number;
  freshmanAmount: number;
  attendingAmount: number;
  rosterReady: boolean;
  totalCount: number;
  paidCount: number;
  collectedAmount: number;
  members: FeeMember[];
}

const won = (n: number) => `${n.toLocaleString()}원`;

export const FeeTab = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(
    ACTIVE_MONTHS.includes(today.getMonth() + 1) ? today.getMonth() + 1 : 3
  );

  const [data, setData] = useState<FeeMonthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 금액 설정 입력값 (저장 전 초안)
  const [freshmanInput, setFreshmanInput] = useState("");
  const [attendingInput, setAttendingInput] = useState("");
  const [isSavingSetting, setIsSavingSetting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 디스코드 발송 모달
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMonth(currentYear, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, currentMonth]);

  const applyData = (d: FeeMonthData) => {
    setData(d);
    setFreshmanInput(String(d.freshmanAmount ?? 0));
    setAttendingInput(String(d.attendingAmount ?? 0));
  };

  const fetchMonth = async (year: number, month: number) => {
    setIsLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const res = await api.get(`/admin/fees/${year}/${month}`);
      applyData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.message || "회비 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSetting = async () => {
    setIsSavingSetting(true);
    try {
      const res = await api.put(`/admin/fees/${currentYear}/${currentMonth}/settings`, {
        freshmanAmount: Number(freshmanInput) || 0,
        attendingAmount: Number(attendingInput) || 0,
      });
      applyData(res.data);
      alert("회비 금액이 저장되었습니다.");
    } catch (e) {
      alert("회비 금액 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingSetting(false);
    }
  };

  const handleTogglePaid = async (member: FeeMember) => {
    setTogglingId(member.loginId);
    try {
      const res = await api.put(
        `/admin/fees/${currentYear}/${currentMonth}/payments`,
        null,
        { params: { loginId: member.loginId } }
      );
      // 응답에 갱신된 집계(납부 인원/걷힌 금액)가 함께 들어있어 그대로 반영
      setData(res.data);
    } catch (e) {
      alert("납부 처리 중 오류가 발생했습니다.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSyncRoster = async () => {
    const label = data?.rosterReady ? "새로 들어온 부원을 이 달 명단에 추가할까요?" :
      `${currentYear}년 ${currentMonth}월 명단을 현재 재학생/신입생 기준으로 만들까요?`;
    if (!confirm(label)) return;
    setIsSyncing(true);
    try {
      const res = await api.post(`/admin/fees/${currentYear}/${currentMonth}/roster`);
      applyData(res.data);
    } catch (e) {
      alert("명단 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveFromRoster = async (member: FeeMember) => {
    if (!confirm(`${member.name}님을 ${currentMonth}월 회비 명단에서 뺄까요?\n납부 기록도 함께 삭제됩니다.`)) return;
    try {
      const res = await api.delete(`/admin/fees/${currentYear}/${currentMonth}/roster`, {
        params: { loginId: member.loginId },
      });
      applyData(res.data);
    } catch (e) {
      alert("명단에서 제외하는 중 오류가 발생했습니다.");
    }
  };

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.members;
    return data.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.studentId || "").includes(q) ||
        (m.discordTag || "").toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const unpaidMembers = useMemo(() => (data ? data.members.filter((m) => !m.paid) : []), [data]);
  const paidMembers = useMemo(() => (data ? data.members.filter((m) => m.paid) : []), [data]);

  const toggleSelect = (loginId: string) => {
    setSelectedIds((prev) =>
      prev.includes(loginId) ? prev.filter((id) => id !== loginId) : [...prev, loginId]
    );
  };
  const selectMany = (members: FeeMember[]) => setSelectedIds(members.map((m) => m.loginId));

  const selectedMembers = useMemo(
    () => (data ? data.members.filter((m) => selectedIds.includes(m.loginId)) : []),
    [data, selectedIds]
  );

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      alert("메시지를 보낼 인원을 선택해주세요.");
      return;
    }
    if (!notifyMessage.trim()) {
      alert("보낼 메시지를 입력해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.length}명에게 디스코드 DM을 발송할까요?`)) return;

    setIsSending(true);
    try {
      const res = await api.post("/admin/notify", {
        loginIds: selectedIds,
        message: notifyMessage.trim(),
      });
      const { successCount, failCount, results } = res.data;
      const failed = (results || [])
        .filter((r: any) => r.status !== "success")
        .map(
          (r: any) =>
            `${r.name}(${r.status === "no_discord" ? "디스코드 미연동" : r.status === "not_found" ? "회원 없음" : "발송 실패"})`
        )
        .join(", ");
      alert(`발송 완료: 성공 ${successCount}건, 실패 ${failCount}건` + (failed ? `\n\n실패: ${failed}` : ""));
      setIsNotifyOpen(false);
    } catch (e: any) {
      alert(e.response?.data?.message || "발송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  const unpaidVisible = useMemo(() => filteredMembers.filter((m) => !m.paid), [filteredMembers]);
  const paidVisible = useMemo(() => filteredMembers.filter((m) => m.paid), [filteredMembers]);

  const renderRow = (m: FeeMember) => {
    const isSelected = selectedIds.includes(m.loginId);
    const isFreshman = m.userStatus === "신입생";
    return (
                      <tr key={m.loginId} className={`transition-colors ${isSelected ? "bg-indigo-50/40" : m.former ? "bg-slate-50/40" : "hover:bg-slate-50/60"}`}>
                        <td className="px-4 md:px-6 py-4 md:py-5">
                          <button onClick={() => toggleSelect(m.loginId)} className={isSelected ? "text-indigo-600" : "text-slate-300 hover:text-slate-400"}>
                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                        </td>
                        <td className="px-3 md:px-6 py-4 md:py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 truncate">{m.name}</span>
                            <span className={`px-1.5 py-0.5 text-[7px] md:text-[9px] font-black rounded uppercase shrink-0 ${isFreshman ? "bg-cyan-50 text-cyan-600" : "bg-green-50 text-green-600"}`}>
                              {m.userStatus}
                            </span>
                            {m.former && (
                              <span className="px-1.5 py-0.5 text-[7px] md:text-[9px] font-black rounded uppercase shrink-0 bg-slate-200 text-slate-500" title="지금은 회비 대상이 아니지만 이 달 기록은 그대로 보관됩니다">
                                현재 미대상
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-4 md:py-5 text-slate-500 font-bold tracking-wider text-[11px] md:text-sm">{m.studentId}</td>
                        <td className="px-3 md:px-6 py-4 md:py-5 text-indigo-500 font-bold text-[11px] md:text-sm truncate">@{m.discordTag || "미연동"}</td>
                        <td className="px-3 md:px-6 py-4 md:py-5 text-center">
                          <button
                            onClick={() => handleTogglePaid(m)}
                            disabled={togglingId === m.loginId}
                            className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs shadow-sm transition-all disabled:opacity-50 ${
                              m.paid
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-white text-slate-400 border border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {togglingId === m.loginId ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : m.paid ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Circle size={13} />
                            )}
                            {m.paid ? "납부 완료" : "미납"}
                          </button>
                        </td>
                        <td className="px-3 md:px-6 py-4 md:py-5 text-center">
                          <button
                            onClick={() => handleRemoveFromRoster(m)}
                            title="이 달 명단에서 제외"
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* 연도 / 월 선택 */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm w-fit shrink-0">
          <button onClick={() => setCurrentYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm md:text-base font-black text-slate-900 tabular-nums w-16 text-center">{currentYear}년</span>
          <button onClick={() => setCurrentYear((y) => y + 1)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto no-scrollbar">
          {ACTIVE_MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setCurrentMonth(m)}
              className={`px-3.5 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${
                currentMonth === m ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-400 border border-slate-100"
              }`}
            >
              {m}월
            </button>
          ))}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-32 text-slate-400">
          <Loader2 className="animate-spin mb-3" size={28} />
          <p className="font-bold uppercase tracking-widest text-[10px]">불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-2xl md:rounded-[3rem] border border-dashed border-red-200">
          <p className="text-red-500 font-bold text-sm mb-4">{error}</p>
          <button onClick={() => fetchMonth(currentYear, currentMonth)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm">다시 시도</button>
        </div>
      ) : data && (
        <>
          {/* 금액 설정 + 집계 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4 md:mb-5">
                <Coins size={16} className="text-indigo-600" />
                <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase tracking-widest">{currentMonth}월 회비 금액</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-cyan-600 uppercase tracking-widest mb-2">신입생</label>
                  <input
                    type="number"
                    value={freshmanInput}
                    onChange={(e) => setFreshmanInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-green-600 uppercase tracking-widest mb-2">재학생</label>
                  <input
                    type="number"
                    value={attendingInput}
                    onChange={(e) => setAttendingInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm tabular-nums"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveSetting}
                disabled={isSavingSetting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-sm text-xs md:text-sm disabled:opacity-50"
              >
                {isSavingSetting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 금액 저장
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">납부 현황</span>
                </div>
                <div className="text-2xl md:text-4xl font-black text-slate-900 tabular-nums">
                  {data.paidCount}
                  <span className="text-base md:text-xl text-slate-300"> / {data.totalCount}명</span>
                </div>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${data.totalCount ? (data.paidCount / data.totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="mt-2 text-[10px] md:text-xs font-bold text-red-500">미납 {data.totalCount - data.paidCount}명</span>
              </div>

              <div className="bg-indigo-600 p-5 md:p-7 rounded-2xl md:rounded-[2rem] shadow-lg shadow-indigo-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={14} className="text-indigo-200" />
                  <span className="text-[10px] md:text-xs font-black text-indigo-200 uppercase tracking-widest">걷힌 금액</span>
                </div>
                <div className="text-2xl md:text-4xl font-black text-white tabular-nums break-all">{won(data.collectedAmount)}</div>
                <span className="mt-2 text-[10px] md:text-xs font-bold text-indigo-200">
                  신입생 {won(data.freshmanAmount)} · 재학생 {won(data.attendingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* 선택 도구 + 검색 */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 md:mb-6">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <button onClick={() => selectMany(unpaidMembers)} className="px-3 md:px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs hover:bg-red-600 hover:text-white transition-all">
                미납자 전체 ({unpaidMembers.length})
              </button>
              <button onClick={() => selectMany(paidMembers)} className="px-3 md:px-4 py-2 bg-green-50 text-green-600 border border-green-100 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs hover:bg-green-600 hover:text-white transition-all">
                납부자 전체 ({paidMembers.length})
              </button>
              <button onClick={() => selectMany(data.members)} className="px-3 md:px-4 py-2 bg-slate-50 text-slate-600 border border-slate-100 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs hover:bg-slate-600 hover:text-white transition-all">
                전체 선택
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 md:px-4 py-2 bg-white text-slate-400 border border-slate-100 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs hover:bg-slate-50 transition-all">
                선택 해제
              </button>
              <button
                onClick={handleSyncRoster}
                disabled={isSyncing}
                className="px-3 md:px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-lg md:rounded-xl font-black text-[10px] md:text-xs hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSyncing ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} 명단 동기화
              </button>
              <button
                onClick={() => setIsNotifyOpen(true)}
                disabled={selectedIds.length === 0}
                className="px-3 md:px-5 py-2 bg-indigo-600 text-white rounded-lg md:rounded-xl font-black text-[10px] md:text-xs shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                <MessageSquare size={13} /> 디스코드 메시지 ({selectedIds.length})
              </button>
            </div>
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 학번 또는 태그 검색..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-bold text-xs md:text-sm"
              />
            </div>
          </div>

          {/* 명단 */}
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 md:px-6 py-4 md:py-5 w-[6%]">선택</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 w-[30%]">부원 정보</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 w-[15%]">학번</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 w-[25%]">디스코드</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 text-center w-[18%]">회비 납부</th>
                    <th className="px-3 md:px-6 py-4 md:py-5 text-center w-[6%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
                  {/* 미납자를 위에, 납부 완료 인원은 구분선 아래로 따로 모아서 보여준다 */}
                  {unpaidVisible.map(renderRow)}
                  {paidVisible.length > 0 && (
                    <tr className="bg-green-50/60 border-y border-green-100">
                      <td colSpan={6} className="px-4 md:px-6 py-2.5 md:py-3">
                        <span className="text-[9px] md:text-[11px] font-black text-green-600 uppercase tracking-widest">
                          회비 낸 인원 ({paidVisible.length}명)
                        </span>
                      </td>
                    </tr>
                  )}
                  {paidVisible.map(renderRow)}
                </tbody>
              </table>
            </div>
            {filteredMembers.length === 0 && (
              <div className="text-center py-14 md:py-20 px-6">
                {!data.rosterReady && !searchQuery ? (
                  <>
                    <ClipboardList className="mx-auto text-slate-200 mb-3" size={32} />
                    <p className="text-slate-500 font-black text-sm mb-1.5">
                      {currentYear}년 {currentMonth}월 명단이 아직 없습니다
                    </p>
                    <p className="text-slate-400 font-bold text-[11px] md:text-xs mb-5 leading-relaxed">
                      지난 달은 그 달의 부원 명단을 알 수 없어 자동으로 만들지 않습니다.
                      <br className="hidden md:block" />
                      아래 버튼을 누르면 <span className="text-slate-500">현재</span> 재학생/신입생 기준으로 명단을 만듭니다.
                    </p>
                    <button
                      onClick={handleSyncRoster}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs md:text-sm shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} 명단 만들기
                    </button>
                  </>
                ) : (
                  <p className="text-slate-300 font-black uppercase tracking-widest text-xs">
                    {searchQuery ? "검색 결과가 없습니다." : "명단에 등록된 부원이 없습니다."}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* 디스코드 발송 모달 */}
      <AnimatePresence>
        {isNotifyOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-4 md:px-6 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsNotifyOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl md:rounded-[2.5rem] p-6 md:p-9 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">디스코드 메시지 발송</h2>
                <button onClick={() => setIsNotifyOpen(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X size={18} /></button>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">받는 사람 ({selectedMembers.length}명)</span>
                </div>
                <div className="max-h-32 overflow-y-auto bg-slate-50 rounded-xl p-3 flex flex-wrap gap-1.5">
                  {selectedMembers.map((m) => (
                    <span key={m.loginId} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold ${m.paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {m.name}
                      <button onClick={() => toggleSelect(m.loginId)} className="opacity-50 hover:opacity-100"><X size={11} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2">보낼 내용</label>
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  rows={5}
                  placeholder={`예) ${currentMonth}월 회비 납부 안내드립니다. 아직 납부하지 않으신 분들은 확인 부탁드려요!`}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-full flex items-center justify-center gap-2 h-12 md:h-14 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {selectedMembers.length}명에게 발송
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
