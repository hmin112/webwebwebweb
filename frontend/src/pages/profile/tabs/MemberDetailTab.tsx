import { api } from "../../../api/axios";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, FileText, Check, Clock, X,
  Download, Presentation, CalendarDays, MessageCircle,
  FileArchive, ExternalLink, Loader2, ChevronDown, Eye
} from "lucide-react";

// 부모 컴포넌트(AssemblyPage)로부터 전달받는 프롭스 정의
interface MemberDetailProps {
  loginId: string;
  onBack: () => void;
}

export const MemberDetailTab = ({ loginId, onBack }: MemberDetailProps) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 학기 선택 상태 (기본 2026년 1학기)
  const [selectedTerm, setSelectedTerm] = useState({ year: 2026, semester: 1 });
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const termMenuRef = useRef<HTMLDivElement>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const isSubmittedStatus = (status?: string) =>
    status === "SUBMITTED" || status === "제출완료";

  const termOptions = [
    { year: 2026, semester: 1, label: "2026학년도 1학기" },
    { year: 2026, semester: 2, label: "2026학년도 2학기" },
  ];

  // ✨ 학번 포맷팅 함수 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "??";
    const strId = String(id).trim();

    // 1. 이미 '학번' 글자가 포함되어 있다면 그대로 반환
    if (strId.includes("학번")) return strId;

    // 2. 8자리 학번인 경우 (예: 20221234 -> 22학번)
    if (strId.length === 8) {
      return `${strId.substring(2, 4)}학번`;
    }

    // 3. 2자리인 경우 (예: 22 -> 22학번)
    if (strId.length === 2) {
      return `${strId}학번`;
    }

    // 4. 기타 케이스는 뒤에 '학번'만 붙여서 반환
    return `${strId}학번`;
  };

  // 📡 데이터 로드 로직: 백엔드 Admin 및 Assembly 컨트롤러와 연동
  useEffect(() => {
    const fetchFullData = async () => {
      setIsLoading(true);
      try {
        // 1. 전체 부원 목록 조회 (MemberController: /api/members/all)
        const memberRes = await api.get(`/members/all`);

        const targetMember = memberRes.data.find(
          (m: any) => String(m.loginId) === String(loginId) || String(m.id) === String(loginId)
        );

        if (!targetMember) {
          console.error(`아이디 ${loginId}에 해당하는 부원이 목록에 없습니다.`);
          setMemberInfo(null);
          return;
        }

        // 2. 해당 부원의 이번 학기 제출 현황 조회 (AssemblyController: /api/assembly/my-submissions)
        const submissionRes = await api.get(`/assembly/my-submissions`, {
          params: {
            loginId: targetMember.loginId,
            year: selectedTerm.year,
            semester: selectedTerm.semester
          }
        });

        // 3. 화면 표시 데이터 설정
        setMemberInfo({
          ...targetMember,
          displayStudentId: formatStudentId(targetMember.studentId),
          projectTitle: submissionRes.data.projectTitle
        });

        setReports(submissionRes.data.reports || []);

      } catch (e) {
        console.error("데이터 로딩 중 에러 발생:", e);
        setMemberInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullData();
  }, [loginId, selectedTerm]);

  // 학기 선택 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termMenuRef.current && !termMenuRef.current.contains(event.target as Node)) {
        setIsTermMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const getFilenameFromDisposition = (contentDisposition?: string, fallback = "downloaded-file") => {
    if (!contentDisposition) return fallback;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (plainMatch?.[1]) return plainMatch[1];

    return fallback;
  };

  const closePreviewPdf = () => {
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
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

  const handlePreviewPdf = async (path: string) => {
    if (!path) return;
    try {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }

      const response = await api.get("/assembly/download", {
        params: { path },
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setPreviewPdfUrl(blobUrl);
    } catch (e) {
      console.error("PDF 미리보기 로드 실패:", e);
      alert("PDF 미리보기를 불러오는 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-bold tracking-tight text-sm">부원 상세 정보를 동기화하고 있습니다...</p>
      </div>
    );
  }

  if (!memberInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-6">
        <div className="p-4 md:p-6 bg-slate-100 rounded-2xl md:rounded-[2rem] text-slate-400"><X size={32} /></div>
        <div className="text-center px-6">
          <p className="text-slate-900 font-black text-lg md:text-xl mb-1">부원 정보를 찾을 수 없습니다.</p>
          <p className="text-slate-400 font-bold text-xs md:text-sm">아이디({loginId}) 정보를 다시 확인해주세요.</p>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs md:text-sm">목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-16 md:pb-20">

      {/* 🔙 헤더 영역 (이름 + 학번) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-6">
          <button onClick={onBack} className="p-3 md:p-4 bg-white border border-slate-100 rounded-xl md:rounded-2xl text-slate-400 hover:text-indigo-600 transition-all group shrink-0">
            <ArrowLeft className="w-5 h-5 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 md:gap-3 mb-0.5 md:mb-1">
              <h1 className="text-xl md:text-3xl font-[900] text-slate-900 tracking-tight truncate">{memberInfo.name}</h1>
              <span className="px-2 py-0.5 md:px-3 md:py-1 bg-indigo-50 text-indigo-600 text-[8px] md:text-[10px] font-black rounded-md md:rounded-lg uppercase border border-indigo-100/50 shrink-0">
                {memberInfo.displayStudentId}
              </span>
            </div>
            <p className="text-slate-400 font-bold flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm truncate">
              <ExternalLink className="text-indigo-400 w-3 h-3 md:w-3.5 md:h-3.5" /> {memberInfo.projectTitle || "프로젝트 제목 미등록"}
            </p>
          </div>
        </div>

        {/* 학기 선택 버튼 */}
        <div className="relative w-full md:w-auto" ref={termMenuRef}>
          <button onClick={() => setIsTermMenuOpen(!isTermMenuOpen)} className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4 bg-white px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-[1.5rem] border border-slate-100 shadow-sm transition-all active:scale-95">
            <div className="flex items-center gap-2 md:gap-4">
              <CalendarDays className="text-indigo-600 w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="font-black text-slate-900 text-xs md:text-sm">{selectedTerm.year}년도 {selectedTerm.semester}학기</span>
            </div>
            <ChevronDown className="w-4 h-4 md:w-4 md:h-4 text-slate-400" />
          </button>
          <AnimatePresence>
            {isTermMenuOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 md:mt-3 w-full md:w-56 bg-white border border-slate-100 rounded-xl md:rounded-[1.5rem] shadow-2xl z-50 p-1.5 md:p-2 overflow-hidden">
                {termOptions.map((option) => (
                  <button key={`${option.year}-${option.semester}`} onClick={() => { setSelectedTerm({ year: option.year, semester: option.semester }); setIsTermMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 md:px-5 md:py-3 rounded-lg md:rounded-xl text-xs md:text-sm font-bold ${selectedTerm.semester === option.semester ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}>
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 📋 리포트 타임라인 목록 */}
      <div className="space-y-4 md:space-y-6">
        <h3 className="text-sm md:text-xl font-black text-slate-900 uppercase tracking-wider px-1 md:px-2 mb-4 md:mb-8">프로젝트 타임라인</h3>
        {reports.length === 0 ? (
          <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-[2.5rem] border border-dashed border-slate-200 text-slate-400 font-bold text-xs md:text-base">해당 학기에 생성된 리포트가 없습니다.</div>
        ) : (
          reports.map((report) => (
            <motion.div
              key={report.id}
              whileHover={isSubmittedStatus(report.status) ? { scale: 1.01, y: -2 } : {}}
              onClick={() => isSubmittedStatus(report.status) && setSelectedReport(report)}
              className={`bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all group ${isSubmittedStatus(report.status) ? "hover:shadow-xl cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
            >
              <div className="flex items-center gap-3 md:gap-6 min-w-0">
                <span className={`text-lg md:text-2xl font-[900] tracking-tight shrink-0 ${isSubmittedStatus(report.status) ? "text-indigo-600" : "text-slate-400"}`}>{report.month}월</span>
                <div className="h-8 md:h-10 w-px bg-slate-200 shrink-0"></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 md:gap-3 mb-0.5 md:mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] md:text-[10px] font-black uppercase shrink-0 ${isSubmittedStatus(report.status) ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-400"}`}>{report.type}</span>
                    <h4 className="font-bold text-slate-900 text-sm md:text-lg truncate">
                      {report.title || (isSubmittedStatus(report.status) ? `${report.month}월 제출 자료` : `${report.month}월 자료 미제출`)}
                    </h4>
                  </div>
                  <div className="text-[9px] md:text-[11px] text-slate-400 font-black flex items-center gap-1.5 uppercase truncate">
                    {isSubmittedStatus(report.status) ? <><Check className="text-indigo-500 w-3 h-3 md:w-3.5 md:h-3.5" /> {report.date} 제출됨</> : <><Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> 기록이 없습니다</>}
                  </div>
                </div>
              </div>
              {isSubmittedStatus(report.status) && <div className="p-2.5 md:p-4 bg-slate-50 text-slate-300 rounded-xl md:rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0"><Download className="w-4 h-4 md:w-5 md:h-5" /></div>}
            </motion.div>
          ))
        )}
      </div>

      {/* 🔮 상세 정보 모달 */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedReport(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] md:text-[10px] font-black rounded-md uppercase border border-indigo-100">{memberInfo.name} 부원 · {selectedReport.month}월 자료</span>
                  <h3 className="text-xl md:text-3xl font-[900] text-slate-900 tracking-tighter mt-1 md:mt-2">{selectedReport.title || "제목 없음"}</h3>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all shrink-0"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 ml-0.5 md:ml-1">
                  <MessageCircle className="text-indigo-500 w-3.5 h-3.5 md:w-4 md:h-4" />
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">활동 요약 내용</p>
                </div>
                <div className="w-full p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl font-bold text-slate-700 text-xs md:text-sm border border-slate-100/50 whitespace-pre-wrap leading-relaxed">{selectedReport.memo || "작성된 요약 내용이 없습니다."}</div>
              </div>
              <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest ml-0.5 md:ml-1">첨부 파일</p>
                <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                  <DownloadSlot label="발표자료 (PPT)" path={selectedReport.presentationPath} onDownload={() => handleDownload(selectedReport.presentationPath)} />
                  <DownloadSlot label="PDF 보고서" path={selectedReport.pdfPath} onDownload={() => handleDownload(selectedReport.pdfPath)} onPreview={() => handlePreviewPdf(selectedReport.pdfPath)} />
                  <DownloadSlot label="기타 부속 자료" path={selectedReport.otherPath} onDownload={() => handleDownload(selectedReport.otherPath)} />
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-sm md:text-base shadow-xl hover:bg-black transition-all">닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🖼️ PDF 미리보기 */}
      <AnimatePresence>
        {previewPdfUrl && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={closePreviewPdf} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-5xl bg-white h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <span className="font-black text-slate-900 text-sm md:text-base">PDF 미리보기</span>
                </div>
                <button onClick={closePreviewPdf} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-lg md:rounded-xl hover:bg-slate-100 transition-all"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 📥 하위 컴포넌트: 파일 슬롯 (모바일 최적화)
const DownloadSlot = ({ label, path, onDownload, onPreview }: any) => (
  <div className={`flex items-center justify-between p-3.5 md:p-5 rounded-xl md:rounded-2xl border transition-all ${path ? "bg-white border-slate-100 hover:border-indigo-200 group" : "bg-slate-50 border-transparent opacity-30 cursor-not-allowed"}`}>
    <div className="flex items-center gap-3 md:gap-4 min-w-0">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${path ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-300"}`}>
        {label.includes("PPT") ? <Presentation className="w-4 h-4 md:w-5 md:h-5" /> : label.includes("PDF") ? <FileText className="w-4 h-4 md:w-5 md:h-5" /> : <FileArchive className="w-4 h-4 md:w-5 md:h-5" />}
      </div>
      <div className="text-left min-w-0">
        <p className="text-[12px] md:text-sm font-black text-slate-800 truncate">{label}</p>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tight">{path ? "확인 및 다운로드" : "첨부 파일 없음"}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
      {path && onPreview && (
        <button onClick={onPreview} className="p-2 md:p-3 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5 text-[10px] md:text-xs font-black">
          <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">미리보기</span>
        </button>
      )}
      {path && (
        <button onClick={onDownload} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-lg md:rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
          <Download className="w-4 h-4 md:w-4.5 md:h-4.5" />
        </button>
      )}
    </div>
  </div>
);