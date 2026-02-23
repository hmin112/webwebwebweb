import { api } from "../../../api/axios";
import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Check, Clock, X,
  Download, Presentation, CalendarDays, ChevronDown,
  Edit2, Save, MessageCircle, Upload, FileArchive, Loader2,
  Lock
} from "lucide-react";


// ✨ props로 loginId를 직접 받음
export const MyPageTab = ({ loginId }: { loginId: string }) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [submissionMemo, setSubmissionMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]); // ✨ 제출 기간 상태 추가

  const [uploadedFiles, setUploadedFiles] = useState<{
    presentation: File | null;
    pdf: File | null;
    other: File | null;
  }>({ presentation: null, pdf: null, other: null });

  const isSubmittedStatus = (status?: string) =>
    status === "SUBMITTED" || status === "제출완료";

  const fileRefs = {
    presentation: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null)
  };

  // 1. 학기 자동 계산
  const { currentYear, currentSemester } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = (month >= 2 && month <= 7) ? 1 : 2;
    const academicYear = (month === 1) ? year - 1 : year;
    return { currentYear: academicYear, currentSemester: semester };
  }, []);

  // 2. 학기 목록 생성
  const semesterOptions = useMemo(() => {
    const startYear = 2026;
    const options = [];
    let tempYear = startYear;
    let tempSem = 1;
    while (tempYear < currentYear || (tempYear === currentYear && tempSem <= currentSemester)) {
      options.push({ year: tempYear, semester: tempSem });
      tempSem++;
      if (tempSem > 2) { tempSem = 1; tempYear++; }
    }
    return options.reverse();
  }, [currentYear, currentSemester]);

  const [selectedTerm, setSelectedTerm] = useState(semesterOptions[0]);

  // 3. 데이터 로드 함수 (제출 현황 + 프로젝트 제목 + 제출 기간 포함)
  const fetchSubmissions = async () => {
    if (!loginId || loginId === "undefined") return;
    try {
      // ✅ 제출 현황 및 제목 로드
      const res = await api.get(`/assembly/my-submissions`, {
        params: { loginId, year: selectedTerm.year, semester: selectedTerm.semester }
      });

      // ✅ 관리자가 설정한 제출 기간 로드
      const periodRes = await api.get(`/assembly/periods/${selectedTerm.year}`);

      if (res.data) {
        setReports(res.data.reports || []);
        setProjectTitle(res.data.projectTitle || "");
      }
      if (periodRes.data) {
        setSubmissionPeriods(periodRes.data);
      }
    } catch (e) {
      console.error("데이터 로드 실패", e);
    }
  };

  useEffect(() => { fetchSubmissions(); }, [selectedTerm, loginId]);

  // 4. 화면 표시용 리포트 가공 (서버 데이터 + 제출 기간 병합)
  const displayReports = useMemo(() => {
    const targetMonths = selectedTerm.semester === 1 ? [3, 4, 5, 6] : [9, 10, 11, 12];
    const today = new Date().toISOString().split('T')[0];

    return targetMonths.map(month => {
      const serverData = reports.find(r =>
        Number(r.month) === Number(month) &&
        Number(r.year) === Number(selectedTerm.year) &&
        Number(r.semester) === Number(selectedTerm.semester)
      );

      // ✨ 해당 월의 제출 기간 정보 찾기
      const periodInfo = submissionPeriods.find(p =>
        Number(p.month) === Number(month) &&
        Number(p.semester) === Number(selectedTerm.semester)
      );

      // ✨ 제출 가능 여부 판단
      const isWithinPeriod = periodInfo ? (today >= periodInfo.startDate && today <= periodInfo.endDate) : false;
      const isPast = periodInfo ? (today > periodInfo.endDate) : false;

      const baseData = serverData || {
        id: `temp-${month}`,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        month: month,
        type: (month === 3 || month === 9) ? "계획서" : (month === 6 || month === 12 ? "결과물" : "진행보고"),
        status: "미제출",
        memo: ""
      };

      return {
        ...baseData,
        isWithinPeriod,
        isPast,
        startDate: periodInfo?.startDate,
        endDate: periodInfo?.endDate
      };
    });
  }, [reports, selectedTerm, submissionPeriods]);

  // ✅ 5. 프로젝트 제목 저장 (백엔드 연결)
  const handleSaveProjectTitle = async () => {
    if (!projectTitle.trim()) {
      alert("프로젝트 명을 입력해주세요.");
      return;
    }
    try {
      await api.post(`/assembly/project-title`, {
        loginId,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        title: projectTitle
      });
      setIsEditingProject(false);
      alert("프로젝트 명이 저장되었습니다.");
      await fetchSubmissions();
    } catch (e: any) {
      alert("제목 저장 실패: " + (e.response?.data || e.message));
    }
  };

  // ✅ 기간 내 제출 가능 로직 수정 (이미 제출한 경우도 기간 지나면 수정 불가)
  const canSubmit = useMemo(() => {
    if (!selectedReport || !selectedReport.isWithinPeriod) return false;
    const hasNewFile = Boolean(uploadedFiles.presentation || uploadedFiles.pdf || uploadedFiles.other);
    const hasExistingFile = Boolean(
      selectedReport.presentationPath || selectedReport.pdfPath || selectedReport.otherPath
    );
    return hasNewFile || hasExistingFile;
  }, [uploadedFiles, selectedReport]);

  const handlePresentationFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setUploadedFiles({ ...uploadedFiles, presentation: null });
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".ppt") && !lowerName.endsWith(".pptx")) {
      alert("발표자료는 .ppt 또는 .pptx 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    setUploadedFiles({ ...uploadedFiles, presentation: file });
  };

  const handlePdfFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setUploadedFiles({ ...uploadedFiles, pdf: null });
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".pdf")) {
      alert("PDF 항목에는 .pdf 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    setUploadedFiles({ ...uploadedFiles, pdf: file });
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
      console.error("파일 다운로드 실패:", e);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (!loginId || loginId === "undefined") {
      alert("로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.");
      return;
    }

    const hasNewFile = Boolean(uploadedFiles.presentation || uploadedFiles.pdf || uploadedFiles.other);
    const hasExistingFile = Boolean(
      selectedReport?.presentationPath || selectedReport?.pdfPath || selectedReport?.otherPath
    );
    if (!hasNewFile && !hasExistingFile) {
      alert("발표자료, PDF, 기타자료 중 하나 이상 업로드해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("loginId", loginId);

      const rId = selectedReport.id?.toString() || "0";
      formData.append("reportId", rId.includes("temp") ? "0" : rId);

      formData.append("month", selectedReport.month.toString());
      formData.append("year", selectedTerm.year.toString());
      formData.append("semester", selectedTerm.semester.toString());
      formData.append("memo", submissionMemo);

      if (uploadedFiles.presentation) formData.append("presentation", uploadedFiles.presentation);
      if (uploadedFiles.pdf) formData.append("pdf", uploadedFiles.pdf);
      if (uploadedFiles.other) formData.append("other", uploadedFiles.other);

      await api.post(`/assembly/submit`, formData);

      alert("제출이 완료되었습니다! 🎉");
      setSelectedReport(null);
      await fetchSubmissions();
    } catch (e: any) {
      const serverMessage =
        typeof e.response?.data === "string"
          ? e.response.data
          : e.response?.data?.message;
      alert(`제출 실패: ${serverMessage || e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">

      <div className="flex flex-col xl:flex-row justify-between items-center mb-12 gap-4">
        <div className="relative w-full xl:w-auto h-16">
          <div className="flex items-center gap-4 bg-white px-6 h-full rounded-[1.5rem] border border-slate-100 shadow-sm">
            <CalendarDays className="text-indigo-600" size={20} />
            <select
              value={`${selectedTerm.year}-${selectedTerm.semester}`}
              onChange={(e) => {
                const [y, s] = e.target.value.split("-").map(Number);
                setSelectedTerm({ year: y, semester: s });
              }}
              className="appearance-none bg-transparent border-none outline-none font-bold text-slate-900 text-lg pr-8 cursor-pointer h-full"
            >
              {semesterOptions.map((option, idx) => (
                <option key={idx} value={`${option.year}-${option.semester}`}>{option.year}학년도 {option.semester}학기</option>
              ))}
            </select>
            <ChevronDown className="absolute right-6 pointer-events-none text-slate-400" size={18} />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          <CompactStatusCard title="학기 제출 현황" value={`${reports.filter(r => isSubmittedStatus(r.status)).length} / 4`} icon={<FileText size={18} />} color="indigo" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between px-2 mb-8 gap-4">
          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider">총회자료 제출</h3>
          <div className="relative group max-w-md w-full flex justify-end">
            {isEditingProject ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <input
                  type="text"
                  autoFocus
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectTitle()}
                  className="w-full md:w-80 bg-slate-100 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-sm text-right"
                />
                <button onClick={handleSaveProjectTitle} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">
                  <Save size={16} />
                </button>
              </div>
            ) : (
              <div onClick={() => setIsEditingProject(true)} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-xl justify-end">
                <h2 className={`text-sm font-bold text-right ${projectTitle ? "text-slate-600" : "text-slate-300"}`}>
                  {projectTitle || "이번학기의 프로젝트 명을 입력해주세요."}
                </h2>
                <Edit2 size={14} className="text-slate-300" />
              </div>
            )}
          </div>
        </div>

        {displayReports.map((report) => (
          <motion.div
            key={report.id}
            whileHover={{ scale: 1.01, y: -2 }}
            onClick={() => {
              setSelectedReport(report);
              setSubmissionMemo(report.memo || "");
              setUploadedFiles({ presentation: null, pdf: null, other: null });
            }}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all cursor-pointer hover:shadow-xl"
          >
            <div className="flex items-center gap-6">
              <span className={`text-2xl font-bold ${isSubmittedStatus(report.status) ? "text-indigo-600" : "text-slate-400"}`}>{report.month}월</span>
              <div className="h-10 w-px bg-slate-200"></div>
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${isSubmittedStatus(report.status) ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-400"}`}>{report.type}</span>
                  <h4 className="font-bold text-slate-900 text-lg">
                    {(isSubmittedStatus(report.status) && report.memo) ? report.memo : `${report.month}월 프로젝트 보고서`}
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase">
                  {isSubmittedStatus(report.status) ? (
                    <span className="flex items-center gap-1.5 text-indigo-500"><Check size={14} /> {report.date || "최근"} 제출됨 (클릭하여 확인)</span>
                  ) : report.isWithinPeriod ? (
                    <span className="flex items-center gap-1.5 text-green-500 font-black"><Clock size={14} /> 현재 제출 가능 (~{report.endDate})</span>
                  ) : report.isPast ? (
                    <span className="flex items-center gap-1.5 text-pink-500 font-black"><X size={14} /> 제출 기간 종료</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {report.startDate ? `${report.startDate} 부터` : "기간 미설정"}</span>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-4 py-2 rounded-full border ${isSubmittedStatus(report.status) ? "text-green-600 bg-green-50 border-green-100" : report.isWithinPeriod ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-orange-600 bg-orange-50 border-orange-100"}`}>
              {isSubmittedStatus(report.status) ? "제출완료" : report.isWithinPeriod ? "제출가능" : "제출불가"}
            </span>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedReport(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg uppercase border border-indigo-100">{selectedReport.month}월 자료</span>
                  <h3 className="text-3xl font-bold text-slate-900 mt-2">
                    {isSubmittedStatus(selectedReport.status) ? (selectedReport.isWithinPeriod ? "제출 내용 수정" : "제출 자료 확인") : "신규 자료 제출"}
                  </h3>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100"><X size={20} /></button>
              </div>

              {/* ✨ 기간 종료 알림 - 기간 종료 시 읽기 전용으로 전환됨을 알림 */}
              {!selectedReport.isWithinPeriod && (
                <div className="mb-6 p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 text-white">
                  <Lock size={20} className="text-indigo-400" />
                  <div>
                    <p className="text-sm font-bold">현재 제출 및 수정 가능 기간이 아닙니다.</p>
                    <p className="text-[10px] text-white/50 italic uppercase tracking-wider">등록된 파일은 다운로드만 가능합니다.</p>
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3 ml-1"><MessageCircle size={16} className="text-indigo-500" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">활동 요약</p></div>
                <textarea
                  value={submissionMemo}
                  onChange={(e) => setSubmissionMemo(e.target.value)}
                  disabled={!selectedReport.isWithinPeriod}
                  placeholder="활동 내용을 입력해주세요."
                  className="w-full p-5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm min-h-[100px] disabled:opacity-50"
                />
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-xs font-bold text-slate-400 ml-1 uppercase">제출 파일 관리</p>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="file"
                    accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    ref={fileRefs.presentation}
                    className="hidden"
                    onChange={handlePresentationFileChange}
                  />
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    ref={fileRefs.pdf}
                    className="hidden"
                    onChange={handlePdfFileChange}
                  />
                  <input type="file" ref={fileRefs.other} className="hidden" onChange={(e) => setUploadedFiles({ ...uploadedFiles, other: e.target.files![0] })} />

                  <UploadSlot
                    label="발표자료"
                    required={false}
                    disabled={!selectedReport.isWithinPeriod}
                    existingPath={selectedReport.presentationPath}
                    fileName={uploadedFiles.presentation?.name}
                    onDownload={() => handleDownload(selectedReport.presentationPath)}
                    onClick={() => selectedReport.isWithinPeriod && fileRefs.presentation.current?.click()}
                  />
                  <UploadSlot
                    label="PDF"
                    required={false}
                    disabled={!selectedReport.isWithinPeriod}
                    existingPath={selectedReport.pdfPath}
                    fileName={uploadedFiles.pdf?.name}
                    onDownload={() => handleDownload(selectedReport.pdfPath)}
                    onClick={() => selectedReport.isWithinPeriod && fileRefs.pdf.current?.click()}
                  />
                  <UploadSlot
                    label="기타 자료"
                    disabled={!selectedReport.isWithinPeriod}
                    existingPath={selectedReport.otherPath}
                    fileName={uploadedFiles.other?.name}
                    onDownload={() => handleDownload(selectedReport.otherPath)}
                    onClick={() => selectedReport.isWithinPeriod && fileRefs.other.current?.click()}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setSelectedReport(null)} className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all">닫기</button>
                {/* ✨ 제출 기간 내일 때만 제출/수정 버튼 표시 */}
                {selectedReport.isWithinPeriod && (
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    className={`flex-2 px-8 py-5 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${canSubmit && !isLoading ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (isSubmittedStatus(selectedReport.status) ? "수정 내용 저장" : "제출 완료하기")}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ✅ UploadSlot 컴포넌트 수정: 기간 종료 시 다운로드 버튼만 노출
const UploadSlot = ({ label, required, fileName, onClick, disabled, existingPath, onDownload }: any) => (
  <div className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${fileName || existingPath ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fileName || existingPath ? "bg-indigo-600 text-white" : "bg-white text-slate-400"}`}>
        {label === "발표자료" ? <Presentation size={20} /> : label === "PDF" ? <FileText size={20} /> : <FileArchive size={20} />}
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-slate-800">{label} {required && <span className="text-pink-500 ml-1">*</span>}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{fileName || (existingPath ? "제출된 파일 있음" : "자료가 없습니다.")}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {existingPath && (
        <button onClick={onDownload} className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm hover:bg-indigo-50 transition-all border border-indigo-100">
          <Download size={16} />
        </button>
      )}
      {!disabled && (
        <button onClick={onClick} className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all">
          <Upload size={16} />
        </button>
      )}
    </div>
  </div>
);

const CompactStatusCard = ({ title, value, icon, color }: any) => {
  const colorMap: any = { indigo: "text-indigo-600 bg-indigo-50 border-indigo-100", green: "text-green-600 bg-green-50 border-green-100" };
  return (
    <div className="bg-white px-6 h-16 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-5 min-w-[230px]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div className="flex flex-1 items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">{title}</p>
        <p className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">{value}</p>
      </div>
    </div>
  );
};
