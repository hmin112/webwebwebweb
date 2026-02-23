import { api } from "../../../api/axios";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange, Save, Clock, AlertCircle,
  CheckCircle2, ChevronLeft, ChevronRight, FileText, ClipboardList, Loader2,
  Users, Download, X, Check, FileArchive, Search
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
}

export const AdminPeriodTab = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [periods, setPeriods] = useState<MonthPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✨ 제출 상세 현황 모달 상태
  const [selectedPeriod, setSelectedPeriod] = useState<MonthPeriod | null>(null);
  const [submittedMembers, setSubmittedMembers] = useState<SubmittedMember[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // ✨ 추가: 다운로드 파일 형식 옵션 ('all' | 'ppt' | 'pdf')
  const [downloadType, setDownloadType] = useState<string>("all");

  // 1. 서버에서 특정 연도의 제출 기간 및 현황 데이터 로드
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

  // 2. 특정 기간의 제출 인원 상세 정보 로드
  const fetchSubmittedMembers = async (period: MonthPeriod) => {
    setIsDetailLoading(true);
    setSelectedUserIds([]);
    try {
      const res = await api.get(`/admin/periods/submissions`, {
        params: { year: period.year, semester: period.semester, month: period.month }
      });
      setSubmittedMembers(res.data || []);
    } catch (e) {
      console.error("제출 명단 로드 실패", e);
    } finally {
      setIsDetailLoading(false);
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

  useEffect(() => {
    fetchPeriods(currentYear);
  }, [currentYear]);

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

  // ✨ 파일 일괄 다운로드 (ZIP) 핸들러 - 400 에러 방지를 위한 파라미터 검증 포함
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
      window.URL.revokeObjectURL(url); // 메모리 해제
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
      <div className="space-y-4 mb-12">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {semesterNum}학기 운영 설정
          </h3>
        </div>
        <div className="grid gap-4">
          {semesterPeriods.map((period) => {
            const today = new Date().toISOString().split('T')[0];
            const isOpen = today >= period.startDate && today <= period.endDate;
            const isPast = today > period.endDate;

            return (
              <div key={period.month} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">

                  <div className="flex items-center gap-5 min-w-[240px]">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOpen ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : isPast ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-300"}`}>
                      {period.type === "계획서" ? <FileText size={24} /> : <ClipboardList size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-black text-slate-900">{period.month}월</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${period.type === "계획서" ? "text-pink-500 border-pink-100 bg-pink-50" : "text-indigo-500 border-indigo-100 bg-indigo-50"}`}>
                          {period.type}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                        {isOpen ? "Currently Open" : isPast ? "Submission Ended" : "Scheduled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-4 top-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Start</span>
                      <input
                        type="date"
                        value={period.startDate}
                        onChange={(e) => handleDateChange(period.month, 'startDate', e.target.value)}
                        className="w-full pt-6 pb-3 px-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">End</span>
                      <input
                        type="date"
                        value={period.endDate}
                        onChange={(e) => handleDateChange(period.month, 'endDate', e.target.value)}
                        className="w-full pt-6 pb-3 px-4 bg-slate-50 border-none rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedPeriod(period);
                      fetchSubmittedMembers(period);
                    }}
                    className="xl:w-48 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group"
                  >
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">제출 현황</span>
                      <span className="text-xs font-black text-indigo-600 group-hover:scale-110 transition-transform">
                        {period.submittedCount || 0}/{period.totalCount || 0} 명
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl pb-20 font-sans relative">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
              <CalendarRange size={20} />
            </div>
            <h2 className="text-4xl font-[900] text-slate-900 tracking-tighter uppercase">Academic Schedule</h2>
          </div>
          <p className="text-slate-500 font-medium">제출 현황 박스를 클릭하면 제출한 인원의 파일 목록 확인 및 일괄 다운로드가 가능합니다.</p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
          <button onClick={() => handleYearChange(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-xl font-black text-slate-900 tracking-tighter w-16 text-center">{currentYear}</span>
          <button onClick={() => handleYearChange(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase tracking-widest text-xs">Synchronizing with Server...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderSemester(1)}
          {renderSemester(2)}
        </div>
      )}

      {/* ✨ 상세 제출 현황 모달 */}
      <AnimatePresence>
        {selectedPeriod && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-6">
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
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <Users className="text-indigo-600" />
                    {selectedPeriod.month}월 제출 상세 현황
                  </h3>
                  <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    {selectedPeriod.year} Academic • {selectedPeriod.type}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPeriod(null)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 py-4 bg-slate-50/50 flex flex-wrap justify-between items-center gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (selectedUserIds.length === submittedMembers.length) setSelectedUserIds([]);
                      else setSelectedUserIds(submittedMembers.map(m => m.loginId));
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    {selectedUserIds.length === submittedMembers.length ? <X size={14} /> : <Check size={14} />}
                    전체 선택/해제
                  </button>
                  <span className="text-xs font-bold text-slate-400">
                    선택됨: <span className="text-indigo-600">{selectedUserIds.length}</span> / {submittedMembers.length}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                    {[
                      { id: 'all', label: '전체' },
                      { id: 'ppt', label: 'PPT만' },
                      { id: 'pdf', label: 'PDF만' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setDownloadType(opt.id)}
                        className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${downloadType === opt.id
                            ? "bg-slate-900 text-white shadow-md"
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
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedUserIds.length > 0
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-500"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <FileArchive size={16} />
                    ZIP 다운로드
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {isDetailLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="font-bold">명단을 동기화 중입니다...</p>
                  </div>
                ) : submittedMembers.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {submittedMembers.map((member) => (
                      <div
                        key={member.loginId}
                        className={`flex flex-col md:flex-row items-center justify-between p-5 rounded-3xl border transition-all ${selectedUserIds.includes(member.loginId)
                            ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                            : "bg-white border-slate-100 hover:border-indigo-100"
                          }`}
                      >
                        <div className="flex items-center gap-5 w-full md:w-auto">
                          <button
                            onClick={() => {
                              if (selectedUserIds.includes(member.loginId)) setSelectedUserIds(selectedUserIds.filter(id => id !== member.loginId));
                              else setSelectedUserIds([...selectedUserIds, member.loginId]);
                            }}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedUserIds.includes(member.loginId)
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-slate-200"
                              }`}
                          >
                            {selectedUserIds.includes(member.loginId) && <Check size={14} strokeWidth={4} />}
                          </button>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                              {member.name.substring(0, 1)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 leading-none mb-1">{member.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {member.studentId} • {member.submitDate} 제출
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                          {/* ✨ 경로 매핑 오류 방지: 슬래시(/) 중복 제거 로직 반영 */}
                          {member.presentationPath && (downloadType === "all" || downloadType === "ppt") && (
                            <button
                              type="button"
                              onClick={() => handleDownload(member.presentationPath)}
                              className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                              title="발표자료 다운로드"
                            >
                              <FileArchive size={16} />
                            </button>
                          )}
                          {member.pdfPath && (downloadType === "all" || downloadType === "pdf") && (
                            <button
                              type="button"
                              onClick={() => handleDownload(member.pdfPath)}
                              className="p-2.5 bg-pink-50 text-pink-600 rounded-xl hover:bg-pink-100 transition-colors"
                              title="PDF 다운로드"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          <div className="w-px h-6 bg-slate-100 mx-2" />
                          <p className="text-xs font-bold text-slate-600 max-w-[150px] truncate italic">
                            {member.memo || "메모 없음"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-black opacity-30 tracking-tight">아직 제출한 인원이 없습니다.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-12 flex items-center justify-between p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-4 text-white/60">
          <AlertCircle size={20} />
          <p className="text-sm font-bold tracking-tight">저장 시 즉시 모든 부원의 마이페이지 접근 권한에 반영됩니다.</p>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={isLoading}
          className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-xl active:scale-95 shrink-0"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} {currentYear}년 전체 일정 저장
        </Button>
      </div>
    </motion.div>
  );
};
