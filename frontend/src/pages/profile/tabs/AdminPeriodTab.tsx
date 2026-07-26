import { api } from "../../../api/axios";
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange, Save, Clock, AlertCircle,
  CheckCircle2, ChevronLeft, ChevronRight, FileText, ClipboardList, Loader2,
  Users, Download, X, Check, FileArchive, Search, Filter, MessageSquare, Send
} from "lucide-react";
import { Button } from "../../../components/ui/button";

interface MonthPeriod {
  id?: number;
  month: number;
  year: number;
  semester: 1 | 2;
  type: string;
  startDate: string;
  endDate: string;
  submittedCount?: number;
  totalCount?: number;
}

interface SubmittedMember {
  loginId: string;
  name: string;
  studentId: string;
  submitDate: string;
  presentationPath?: string;
  pdfPath?: string;
  otherPath?: string;
  memo?: string;
  teamId?: number | null;
  teamName?: string | null;
}

export const AdminPeriodTab = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [periods, setPeriods] = useState<MonthPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✨ 부원 전체 명단 (미제출자 계산용)
  const [allMembers, setAllMembers] = useState<any[]>([]);

  // 제출 상세 현황 모달 상태
  const [selectedPeriod, setSelectedPeriod] = useState<MonthPeriod | null>(null);
  const [submittedMembers, setSubmittedMembers] = useState<SubmittedMember[]>([]);
  const [unsubmittedMembers, setUnsubmittedMembers] = useState<any[]>([]); // ✨ 미제출자 명단 상태 추가
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 다운로드 파일 형식 옵션 ('all' | 'ppt' | 'pdf')
  const [downloadType, setDownloadType] = useState<string>("all");

  // ✨ 정렬 옵션 상태 추가
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest" | "id_desc" | "id_asc">("latest");

  // ✨ [신규] 디스코드 알림 발송 모달 상태
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySelectedIds, setNotifySelectedIds] = useState<string[]>([]);
  const [isSendingNotify, setIsSendingNotify] = useState(false);

  // 1. 서버에서 특정 연도의 제출 기간 및 현황 데이터 로드
  useEffect(() => {
    fetchPeriods(currentYear);
    fetchAllMembers();
  }, [currentYear]);

  const fetchPeriods = async (year: number) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/periods/${year}`);
      if (res.data && res.data.length > 0) {
        setPeriods(res.data);
      } else {
        setPeriods(generateInitialPeriods(year));
      }
    } catch (e) {
      console.error("기간 로드 실패", e);
      setPeriods(generateInitialPeriods(year));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllMembers = async () => {
    try {
      const res = await api.get("/admin/members");
      setAllMembers(res.data || []);
    } catch (e) {
      console.error("전체 부원 명단 로드 실패", e);
    }
  };

  // 2. 특정 기간의 제출 인원 상세 정보 로드
  const fetchSubmittedMembers = async (period: MonthPeriod) => {
    setIsDetailLoading(true);
    setSelectedUserIds([]);
    try {
      const res = await api.get(`/admin/periods/submissions`, {
        params: { year: period.year, semester: period.semester, month: period.month }
      });
      const submitted = res.data || [];
      setSubmittedMembers(submitted);

      // ✨ 미제출자 계산 (재학생, 신입생 중 제출하지 않은 인원)
      const unsubmitted = allMembers.filter(m => {
        const isSubmitted = submitted.some((sub: SubmittedMember) => sub.loginId === m.loginId);
        const isActiveMember = m.userStatus === "재학생" || m.userStatus === "신입생";
        return !isSubmitted && isActiveMember;
      });
      setUnsubmittedMembers(unsubmitted);
    } catch (e) {
      console.error("제출 명단 로드 실패", e);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // ✨ 정렬 로직 적용
  const sortedSubmittedMembers = useMemo(() => {
    return [...submittedMembers].sort((a, b) => {
      if (sortOrder === "latest") return new Date(b.submitDate).getTime() - new Date(a.submitDate).getTime();
      if (sortOrder === "oldest") return new Date(a.submitDate).getTime() - new Date(b.submitDate).getTime();
      if (sortOrder === "id_asc") return a.studentId.localeCompare(b.studentId);
      if (sortOrder === "id_desc") return b.studentId.localeCompare(a.studentId);
      return 0;
    });
  }, [submittedMembers, sortOrder]);

  const sortedUnsubmittedMembers = useMemo(() => {
    return [...unsubmittedMembers].sort((a, b) => {
      if (sortOrder === "id_asc" || sortOrder === "oldest" || sortOrder === "latest") return a.studentId.localeCompare(b.studentId);
      return b.studentId.localeCompare(a.studentId); // default id_desc for unsubmitted
    });
  }, [unsubmittedMembers, sortOrder]);

  // ✨ [신규] 같은 팀 소속 제출자끼리 묶어서 보여주기 위한 그룹핑 (팀이면 같은 파일 공동제출임을 표시)
  const groupedSubmittedMembers = useMemo(() => {
    const groups: { key: string; teamId?: number | null; teamName?: string | null; members: SubmittedMember[] }[] = [];
    const indexByKey = new Map<string, number>();
    sortedSubmittedMembers.forEach((m) => {
      const key = m.teamId ? `team-${m.teamId}` : `solo-${m.loginId}`;
      if (!indexByKey.has(key)) {
        indexByKey.set(key, groups.length);
        groups.push({ key, teamId: m.teamId, teamName: m.teamName, members: [] });
      }
      groups[indexByKey.get(key)!].members.push(m);
    });
    return groups;
  }, [sortedSubmittedMembers]);

  // ✨ [신규] 팀 그룹 전체 선택/해제 토글
  const toggleTeamSelection = (members: SubmittedMember[]) => {
    const ids = members.map(m => m.loginId);
    const allSelected = ids.every(id => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(selectedUserIds.filter(id => !ids.includes(id)));
    } else {
      setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...ids])));
    }
  };

  // ✨ [신규] 제출자 한 명의 행 렌더링 (팀 그룹/개인 모두 공용으로 사용)
  const renderMemberRow = (member: SubmittedMember) => (
    <div
      key={member.loginId}
      className={`flex flex-col xl:flex-row xl:items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${selectedUserIds.includes(member.loginId)
          ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
          : "bg-slate-50/50 border-slate-100 hover:border-indigo-100"
        }`}
    >
      <div className="flex items-center gap-3 w-full xl:w-auto">
        <button
          onClick={() => {
            if (selectedUserIds.includes(member.loginId)) setSelectedUserIds(selectedUserIds.filter(id => id !== member.loginId));
            else setSelectedUserIds([...selectedUserIds, member.loginId]);
          }}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedUserIds.includes(member.loginId)
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-slate-300"
            }`}
        >
          {selectedUserIds.includes(member.loginId) && <Check size={12} strokeWidth={4} />}
        </button>
        <div className="min-w-0">
          <p className="text-xs md:text-sm font-black text-slate-900 leading-none mb-1 truncate">{member.name}</p>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
            {member.studentId} · {member.submitDate.split(' ')[0]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 xl:mt-0 w-full xl:w-auto justify-end">
        {member.presentationPath && (downloadType === "all" || downloadType === "ppt") && (
          <button onClick={() => handleDownload(member.presentationPath!)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
            <FileArchive size={14} />
          </button>
        )}
        {member.pdfPath && (downloadType === "all" || downloadType === "pdf") && (
          <button onClick={() => handleDownload(member.pdfPath!)} className="p-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100">
            <FileText size={14} />
          </button>
        )}
      </div>
    </div>
  );

  // ✨ [신규] 디스코드 알림 대상 선정을 위한 전체 인원(제출완료+미제출) 통합 목록
  const allRelevantMembers = useMemo(() => {
    return allMembers
      .filter((m: any) => m.userStatus === "재학생" || m.userStatus === "신입생")
      .map((m: any) => ({
        ...m,
        isSubmitted: submittedMembers.some((sub) => sub.loginId === m.loginId)
      }))
      .sort((a: any, b: any) => a.studentId.localeCompare(b.studentId));
  }, [allMembers, submittedMembers]);

  const openNotifyModal = () => {
    setNotifyMessage("");
    setNotifySelectedIds([]);
    setIsNotifyOpen(true);
  };

  const toggleNotifyMember = (loginId: string) => {
    setNotifySelectedIds((prev) =>
      prev.includes(loginId) ? prev.filter((id) => id !== loginId) : [...prev, loginId]
    );
  };

  const selectAllNotify = () => {
    if (notifySelectedIds.length === allRelevantMembers.length) setNotifySelectedIds([]);
    else setNotifySelectedIds(allRelevantMembers.map((m: any) => m.loginId));
  };

  const selectUnsubmittedOnlyNotify = () => {
    setNotifySelectedIds(allRelevantMembers.filter((m: any) => !m.isSubmitted).map((m: any) => m.loginId));
  };

  const handleSendNotify = async () => {
    if (notifySelectedIds.length === 0) {
      alert("메시지를 보낼 인원을 선택해주세요.");
      return;
    }
    if (!notifyMessage.trim()) {
      alert("보낼 메시지를 입력해주세요.");
      return;
    }
    if (!confirm(`선택한 ${notifySelectedIds.length}명에게 디스코드 DM을 발송하시겠습니까?`)) return;

    setIsSendingNotify(true);
    try {
      const res = await api.post("/admin/notify", {
        loginIds: notifySelectedIds,
        message: notifyMessage.trim()
      });
      const { successCount, failCount, results } = res.data;
      const failedNames = (results || [])
        .filter((r: any) => r.status !== "success")
        .map((r: any) => `${r.name}(${r.status === "no_discord" ? "디스코드 미연동" : r.status === "not_found" ? "회원 없음" : "발송 실패"})`)
        .join(", ");
      alert(
        `발송 완료: 성공 ${successCount}건, 실패 ${failCount}건` +
        (failedNames ? `\n\n실패: ${failedNames}` : "")
      );
      setIsNotifyOpen(false);
    } catch (e: any) {
      alert(e.response?.data?.message || "알림 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingNotify(false);
    }
  };

  const generateInitialPeriods = (year: number): MonthPeriod[] => {
    const activeMonths = [3, 4, 5, 6, 9, 10, 11, 12];
    return activeMonths.map((m) => ({
      month: m,
      year: year,
      semester: m <= 6 ? 1 : 2,
      type: (m === 3 || m === 9) ? "계획서" : "총회자료",
      startDate: `${year}-${String(m).padStart(2, '0')}-01`,
      endDate: `${year}-${String(m).padStart(2, '0')}-28`,
      submittedCount: 0,
      totalCount: 0,
    }));
  };

  const handleYearChange = (delta: number) => {
    const nextYear = currentYear + delta;
    setCurrentYear(nextYear);
  };

  const handleDateChange = (month: number, field: 'startDate' | 'endDate', value: string) => {
    setPeriods(periods.map(p => p.month === month ? { ...p, [field]: value } : p));
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      await api.post(`/admin/periods/save-all`, periods);
      alert(`${currentYear}년도 모든 제출 기간 설정이 저장되었습니다. 🎉`);
      await fetchPeriods(currentYear);
    } catch (e) {
      console.error("저장 실패", e);
      alert("기간 설정 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✨ 파일 일괄 다운로드 (ZIP) 핸들러
  const handleDownloadZip = async () => {
    if (selectedUserIds.length === 0) {
      alert("다운로드할 인원을 선택해주세요.");
      return;
    }

    if (!selectedPeriod) {
      alert("기간 정보가 올바르지 않습니다.");
      return;
    }

    try {
      const response = await api.post(`/admin/periods/download-zip`, {
        userIds: selectedUserIds,
        year: selectedPeriod.year,
        month: selectedPeriod.month,
        fileType: downloadType
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const typeLabel = downloadType === 'all' ? '전체' : downloadType.toUpperCase();
      link.setAttribute('download', `${selectedPeriod.month}월_제출자료_${typeLabel}_일괄다운로드.zip`);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("ZIP 다운로드 실패", e);
      alert("ZIP 생성 중 오류가 발생했습니다. 서버 상태를 확인해주세요.");
    }
  };

  const getFilenameFromDisposition = (contentDisposition?: string, fallback = "downloaded-file") => {
    if (!contentDisposition) return fallback;
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (plainMatch?.[1]) return plainMatch[1];
    return fallback;
  };

  const handleDownload = async (path: string) => {
    if (!path) return;
    try {
      const response = await api.get("/assembly/download", {
        params: { path },
        responseType: "blob"
      });
      const fallbackName = path.split(/[\\/]/).pop() || "downloaded-file";
      const filename = getFilenameFromDisposition(response.headers["content-disposition"], fallbackName);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("File download failed:", e);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const renderSemester = (semesterNum: 1 | 2) => {
    const semesterPeriods = periods.filter(p => p.semester === semesterNum);
    return (
      <div className="space-y-4 mb-8 md:mb-12">
        <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2 mb-4 md:mb-6">
          <div className="w-1 h-5 md:w-1.5 md:h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
            {semesterNum}학기 운영 설정
          </h3>
        </div>
        <div className="grid gap-3 md:gap-4">
          {semesterPeriods.map((period) => {
            const today = new Date().toISOString().split('T')[0];
            const isOpen = today >= period.startDate && today <= period.endDate;
            const isPast = today > period.endDate;

            return (
              <div key={period.month} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">

                  <div className="flex items-center gap-3 md:gap-5 min-w-0 md:min-w-[240px]">
                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${isOpen ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : isPast ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-300"}`}>
                      {period.type === "계획서" ? <FileText size={20} className="md:w-6 md:h-6" /> : <ClipboardList size={20} className="md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                        <h4 className="text-base md:text-lg font-black text-slate-900">{period.month}월</h4>
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] md:text-[9px] font-black uppercase border shrink-0 ${period.type === "계획서" ? "text-pink-500 border-pink-100 bg-pink-50" : "text-indigo-500 border-indigo-100 bg-indigo-50"}`}>
                          {period.type}
                        </span>
                      </div>
                      <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest italic truncate">
                        {isOpen ? "Currently Open" : isPast ? "Ended" : "Scheduled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-2 md:gap-4">
                    <div className="relative">
                      <span className="absolute left-3 md:left-4 top-1.5 md:top-2 text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</span>
                      <input
                        type="date"
                        value={period.startDate}
                        onChange={(e) => handleDateChange(period.month, 'startDate', e.target.value)}
                        className="w-full pt-4 pb-1.5 md:pt-6 md:pb-3 px-3 md:px-4 bg-slate-50 border-none rounded-lg md:rounded-xl font-bold text-xs md:text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 md:left-4 top-1.5 md:top-2 text-[7px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">End</span>
                      <input
                        type="date"
                        value={period.endDate}
                        onChange={(e) => handleDateChange(period.month, 'endDate', e.target.value)}
                        className="w-full pt-4 pb-1.5 md:pt-6 md:pb-3 px-3 md:px-4 bg-slate-50 border-none rounded-lg md:rounded-xl font-bold text-xs md:text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedPeriod(period);
                      fetchSubmittedMembers(period);
                    }}
                    className="xl:w-48 w-full bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">현황 확인</span>
                      <span className="text-[11px] md:text-xs font-black text-indigo-600 group-hover:scale-105 transition-transform">
                        {period.submittedCount || 0}/{period.totalCount || 0} 명
                      </span>
                    </div>
                    <div className="w-full h-1 md:h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${isPast ? "bg-slate-400" : "bg-indigo-600"}`}
                        style={{
                          width: period.totalCount && period.totalCount > 0
                            ? `${((period.submittedCount || 0) / period.totalCount) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl pb-20 font-sans relative px-1 md:px-0">
      
      {/* 🔝 최상단 헤더 */}
      <header className="mb-8 flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-3">
            <div className="p-1.5 md:p-2 bg-indigo-600 rounded-lg md:rounded-xl text-white shadow-md shrink-0">
              <CalendarRange size={18} className="md:w-5 md:h-5" />
            </div>
            <h2 className="text-xl md:text-4xl font-[900] text-slate-900 tracking-tighter uppercase truncate">제출/자료</h2>
          </div>
          <p className="text-slate-500 font-medium text-[10px] md:text-sm hidden sm:block">제출 기간 설정 및 명단 확인</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm shrink-0">
          <button onClick={() => handleYearChange(-1)} className="p-1 md:p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft size={16} className="md:w-5 md:h-5" /></button>
          <span className="text-base md:text-xl font-black text-slate-900 tracking-tighter w-12 md:w-16 text-center">{currentYear}</span>
          <button onClick={() => handleYearChange(1)} className="p-1 md:p-2 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight size={16} className="md:w-5 md:h-5" /></button>
        </div>
      </header>

      {/* 전체 저장 섹션 */}
      <div className="mb-8 md:mb-12 flex flex-col md:flex-row items-center justify-between p-5 md:p-8 bg-slate-900 rounded-2xl md:rounded-[2.5rem] shadow-xl gap-4">
        <div className="flex items-center gap-3 md:gap-4 text-white/60">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-[10px] md:text-sm font-bold tracking-tight leading-tight">설정 즉시 부원 마이페이지에 반영됩니다.</p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={isLoading}
          className="w-full md:w-auto bg-indigo-600 text-white px-6 py-4 md:px-10 md:py-6 rounded-xl md:rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all text-xs md:text-base h-auto"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {currentYear}년 일정 전체 저장
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={32} />
          <p className="font-bold uppercase tracking-widest text-[10px]">Synchronizing...</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {renderSemester(1)}
          {renderSemester(2)}
        </div>
      )}

      {/* ✨ 상세 제출 현황 모달 (좌우 분할 및 정렬 추가) */}
      <AnimatePresence>
        {selectedPeriod && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setSelectedPeriod(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              // ✨ 좌우 분할을 위해 모달 너비를 더 넓게 설정 (max-w-6xl)
              className="relative w-full max-w-6xl bg-white rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 md:p-8 pb-4 md:pb-6 border-b border-slate-100 flex justify-between items-center">
                <div className="min-w-0">
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2 md:gap-3 truncate">
                    <Users className="text-indigo-600 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                    {selectedPeriod.month}월 제출 상세
                  </h3>
                  <p className="text-[10px] md:text-sm font-bold text-slate-400 mt-0.5 md:mt-1 uppercase tracking-wider truncate">
                    {selectedPeriod.year} · {selectedPeriod.type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPeriod(null)}
                  className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-3 md:px-8 md:py-4 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      if (selectedUserIds.length === submittedMembers.length) setSelectedUserIds([]);
                      else setSelectedUserIds(submittedMembers.map(m => m.loginId));
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-slate-600 flex items-center gap-1.5"
                  >
                    {selectedUserIds.length === submittedMembers.length ? <X size={12} /> : <Check size={12} />}
                    제출자 전체 선택
                  </button>
                  
                  {/* ✨ 정렬 옵션 드롭다운 */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg md:rounded-xl px-2 py-1">
                    <Filter size={14} className="text-slate-400 ml-1" />
                    <select 
                      value={sortOrder} 
                      onChange={(e: any) => setSortOrder(e.target.value)}
                      className="bg-transparent border-none outline-none text-[10px] md:text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      <option value="latest">최신순</option>
                      <option value="oldest">오래된순</option>
                      <option value="id_desc">학번 높은순</option>
                      <option value="id_asc">학번 낮은순</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto">
                  <div className="flex flex-1 md:flex-none bg-white border border-slate-200 rounded-lg p-0.5 md:p-1">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'ppt', label: 'PPT' },
                      { id: 'pdf', label: 'PDF' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDownloadType(opt.id)}
                        className={`flex-1 lg:flex-none px-2.5 py-1 md:px-4 md:py-1.5 rounded-md md:rounded-lg text-[9px] md:text-[11px] font-black transition-all ${downloadType === opt.id
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleDownloadZip}
                    disabled={selectedUserIds.length === 0}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all whitespace-nowrap ${selectedUserIds.length > 0
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-500"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <FileArchive size={14} className="md:w-4 md:h-4" />
                    ZIP 다운로드
                  </button>
                  <button
                    onClick={openNotifyModal}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black transition-all whitespace-nowrap bg-slate-900 text-white shadow-md hover:bg-slate-800"
                  >
                    <MessageSquare size={14} className="md:w-4 md:h-4" />
                    디스코드 알림
                  </button>
                </div>
              </div>

              {/* ✨ 좌우 분할 컨테이너 */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-50/30">
                
                {/* 🟢 제출자 목록 (좌측) */}
                <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-200 overflow-y-auto p-4 md:p-6 bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-indigo-600 flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> 제출 완료 ({sortedSubmittedMembers.length})
                    </h4>
                  </div>
                  
                  {isDetailLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : sortedSubmittedMembers.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 md:gap-3">
                      {groupedSubmittedMembers.map((group) =>
                        group.teamId ? (
                          <div key={group.key} className="p-2.5 md:p-3 rounded-xl md:rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-indigo-600">
                                <Users size={13} /> {group.teamName || "팀 프로젝트"} <span className="text-indigo-300">· 공동제출 {group.members.length}명</span>
                              </span>
                              <button
                                onClick={() => toggleTeamSelection(group.members)}
                                className="text-[9px] md:text-[10px] font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                              >
                                팀 전체 {group.members.every(m => selectedUserIds.includes(m.loginId)) ? "해제" : "선택"}
                              </button>
                            </div>
                            {group.members.map((member) => renderMemberRow(member))}
                          </div>
                        ) : (
                          renderMemberRow(group.members[0])
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-300 text-xs font-bold">제출자가 없습니다.</div>
                  )}
                </div>

                {/* 🔴 미제출자 목록 (우측) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-rose-500 flex items-center gap-1.5">
                      <AlertCircle size={16} /> 미제출 ({sortedUnsubmittedMembers.length})
                    </h4>
                  </div>

                  {isDetailLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                  ) : sortedUnsubmittedMembers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 md:gap-3">
                      {sortedUnsubmittedMembers.map((member) => (
                        <div key={member.loginId} className="flex items-center gap-3 p-3 bg-white rounded-xl md:rounded-2xl border border-slate-100 shadow-sm opacity-70 grayscale-[30%]">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] shrink-0">
                            {member.name.substring(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-black text-slate-700 leading-none mb-1 truncate">{member.name}</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                              {member.studentId}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-300 text-xs font-bold">모두 제출했습니다! 🎉</div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✨ [신규] 디스코드 알림 발송 모달 */}
      <AnimatePresence>
        {isNotifyOpen && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => !isSendingNotify && setIsNotifyOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 md:p-8 pb-4 md:pb-6 border-b border-slate-100 flex justify-between items-center">
                <div className="min-w-0">
                  <h3 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2 md:gap-3 truncate">
                    <MessageSquare className="text-indigo-600 w-5 h-5 md:w-6 md:h-6 shrink-0" />
                    디스코드 알림 보내기
                  </h3>
                  <p className="text-[10px] md:text-sm font-bold text-slate-400 mt-0.5 md:mt-1 truncate">
                    {selectedPeriod?.year}년 {selectedPeriod?.month}월 · 선택 {notifySelectedIds.length}명
                  </p>
                </div>
                <button
                  onClick={() => setIsNotifyOpen(false)}
                  disabled={isSendingNotify}
                  className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 shrink-0 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-8 pt-4 md:pt-6 overflow-y-auto flex-1">
                <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">보낼 메시지</label>
                <textarea
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder="예: 아직 이번 달 총회자료를 제출하지 않으셨어요! 총회 탭에서 제출 부탁드립니다 🙏"
                  className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm min-h-[100px] resize-none mb-5"
                />

                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">받는 사람</label>
                  <div className="flex items-center gap-2">
                    <button onClick={selectUnsubmittedOnlyNotify} className="px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg text-[10px] md:text-xs font-bold hover:bg-rose-100">
                      미제출자만 선택
                    </button>
                    <button onClick={selectAllNotify} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] md:text-xs font-bold text-slate-600 flex items-center gap-1">
                      {notifySelectedIds.length === allRelevantMembers.length ? <X size={11} /> : <Check size={11} />}
                      전체 {notifySelectedIds.length === allRelevantMembers.length ? "해제" : "선택"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {allRelevantMembers.map((member: any) => (
                    <button
                      type="button"
                      key={member.loginId}
                      onClick={() => toggleNotifyMember(member.loginId)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${notifySelectedIds.includes(member.loginId)
                          ? "bg-indigo-50/50 border-indigo-200"
                          : "bg-slate-50/50 border-slate-100 hover:border-indigo-100"
                        }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${notifySelectedIds.includes(member.loginId)
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-300"
                        }`}>
                        {notifySelectedIds.includes(member.loginId) && <Check size={11} strokeWidth={4} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">{member.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{member.studentId}</p>
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${member.isSubmitted ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-500"}`}>
                        {member.isSubmitted ? "제출완료" : "미제출"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 md:p-8 pt-4 md:pt-6 border-t border-slate-100">
                <button
                  onClick={handleSendNotify}
                  disabled={isSendingNotify || notifySelectedIds.length === 0 || !notifyMessage.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-sm transition-all ${!isSendingNotify && notifySelectedIds.length > 0 && notifyMessage.trim()
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-500"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                >
                  {isSendingNotify ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
                  {isSendingNotify ? "발송 중..." : `선택한 ${notifySelectedIds.length}명에게 보내기`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};