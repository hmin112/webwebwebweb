import { api } from "../../../api/axios";
import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, X, Download, Presentation, MessageCircle, Upload, FileArchive, Loader2, Lock, Link2, Plus
} from "lucide-react";
import { FileDropZone } from "../../../components/ui/FileDropZone";
import { CARD, MonthCard, PageHeader, SectionTitle, TermSelect, reportKind, submitStateOf } from "../../assembly/assemblyUi";
import { MyProjectsPicker } from "../../assembly/components/MyProjectsPicker";

// 3월/9월 = 계획서 달. 이 달만 파일 업로드 대신 별도 페이지(AssemblyPlanPage)에서 웹으로 작성.
const isPlanMonth = (month: number) => month === 3 || month === 9;

export const MyPageTab = ({ loginId, onOpenPlanEditor }: { loginId: string; onOpenPlanEditor?: (report: any) => void }) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [submissionMemo, setSubmissionMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const submitLockRef = useRef(false);
  const [reports, setReports] = useState<any[]>([]);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]);
  // ✨ [2026-09-07 추가] 학기별 관련 링크(깃/노션 등) — 커뮤니티 부원 상세에도 그대로 노출됨
  const [projectLinks, setProjectLinks] = useState<{ label: string; url: string }[]>([]);
  const [serverProjectTitle, setServerProjectTitle] = useState("");
  const [isLinksSaving, setIsLinksSaving] = useState(false);
  // 자료를 지우면 개인 프로젝트 유무(대표 자동 선택)가 바뀔 수 있어 내 프로젝트 목록도 다시 읽는다
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);

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

  const { currentYear, currentSemester } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = (month >= 2 && month <= 7) ? 1 : 2;
    const academicYear = (month === 1) ? year - 1 : year;
    return { currentYear: academicYear, currentSemester: semester };
  }, []);

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

  const fetchSubmissions = async () => {
    if (!loginId || loginId === "undefined") return;
    try {
      const res = await api.get(`/assembly/my-submissions`, {
        params: { loginId, year: selectedTerm.year, semester: selectedTerm.semester }
      });
      const periodRes = await api.get(`/assembly/periods/${selectedTerm.year}`);

      if (res.data) {
        setReports(res.data.reports || []);
        setServerProjectTitle(res.data.projectTitle || "");
        setProjectLinks(
          res.data.projectLinks && res.data.projectLinks.length > 0
            ? res.data.projectLinks
            : [{ label: "Git", url: "" }, { label: "Notion", url: "" }]
        );
      }
      if (periodRes.data) {
        setSubmissionPeriods(periodRes.data);
      }
    } catch (e) {
      console.error("데이터 로드 실패", e);
    }
  };

  useEffect(() => { fetchSubmissions(); }, [selectedTerm, loginId]);

  const displayReports = useMemo(() => {
    const targetMonths = selectedTerm.semester === 1 ? [3, 4, 5, 6] : [9, 10, 11, 12];
    const today = new Date().toISOString().split('T')[0];

    return targetMonths.map(month => {
      const serverData = reports.find(r =>
        Number(r.month) === Number(month) &&
        Number(r.year) === Number(selectedTerm.year) &&
        Number(r.semester) === Number(selectedTerm.semester)
      );

      const periodInfo = submissionPeriods.find(p =>
        Number(p.month) === Number(month) &&
        Number(p.semester) === Number(selectedTerm.semester)
      );

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

  // ✨ [2026-09-30] 프로젝트 명은 서버가 정해서 내려준다 — 웹 계획서가 있으면 그 "프로젝트 명", 없으면(예: 파일로
  // 계획서를 냈던 2026년 1학기) 그때 마이페이지에서 따로 저장했던 프로젝트명.
  const projectTitle = serverProjectTitle;

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

  const updateLinkField = (idx: number, field: "label" | "url", value: string) => {
    setProjectLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const addLinkRow = () => setProjectLinks((prev) => [...prev, { label: "", url: "" }]);

  const removeLinkRow = (idx: number) => setProjectLinks((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveLinks = async () => {
    if (!loginId || loginId === "undefined") return;
    setIsLinksSaving(true);
    try {
      await api.post("/assembly/project-links", {
        loginId,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        links: projectLinks.filter((l) => l.label.trim() && l.url.trim())
      });
      alert("링크가 저장되었습니다.");
    } catch (e) {
      console.error("링크 저장 실패", e);
      alert("링크 저장 중 오류가 발생했습니다.");
    } finally {
      setIsLinksSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (submitLockRef.current) return;
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
    submitLockRef.current = true;
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
      const serverMessage = typeof e.response?.data === "string" ? e.response.data : e.response?.data?.message;
      alert(`제출 실패: ${serverMessage || e.message}`);
    } finally {
      setIsLoading(false);
      submitLockRef.current = false;
    }
  };

  // ✨ [2026-09-30] 내가 올린 달 자료 삭제 — 제출 기간 안에서만 (서버도 기간·본인 여부를 다시 확인)
  const canDeleteReport = (report: any) =>
    report.isWithinPeriod &&
    !String(report.id).startsWith("temp") &&
    (isSubmittedStatus(report.status) || report.status === "DRAFT");

  const handleDeleteReport = async (report: any) => {
    const label = `${report.month}월 ${reportKind(report.month)}`;
    if (!window.confirm(`${label}를 삭제할까요?\n올린 파일과 작성한 내용이 모두 지워지고 되돌릴 수 없어요.`)) return;
    try {
      await api.delete("/assembly/report", { params: { loginId, reportId: report.id } });
      await fetchSubmissions();
      setProjectsRefreshKey((k) => k + 1);
    } catch (e: any) {
      alert(e.response?.data?.message || "삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  // ✨ [2026-09-30] 애플 스타일로 재배치 — 머리말(학기 선택) → 요약 카드(프로젝트 명 + 제출 진행) → 달 카드 2열 → 관련 링크.
  // 달 카드는 PLAN/PROGRESS/RESULT 배지 대신 "계획서 / 진행 보고 / 결과 보고"로 표시 (assemblyUi.MonthCard).
  const submittedCount = displayReports.filter((r) => isSubmittedStatus(r.status)).length;
  const openReport = (report: any) => {
    if (isPlanMonth(report.month)) {
      onOpenPlanEditor?.(report);
      return;
    }
    setSelectedReport(report);
    setSubmissionMemo(report.memo || "");
    setUploadedFiles({ presentation: null, pdf: null, other: null });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <PageHeader
        title="마이 페이지"
        desc="이번 학기 내 총회 자료를 달마다 제출하고 관리해요."
        right={
          <div className="flex items-start gap-4 flex-wrap">
            <TermSelect value={selectedTerm} options={semesterOptions} onChange={setSelectedTerm} />
            <MyProjectsPicker loginId={loginId} year={selectedTerm.year} semester={selectedTerm.semester} refreshKey={projectsRefreshKey} />
          </div>
        }
      />

      {/* 요약 카드 — 프로젝트 명(계획서에서 입력) + 제출 진행 */}
      <div className={`${CARD} rounded-3xl p-5 md:p-7 mb-8 md:mb-10`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#8E8E93] mb-1">{selectedTerm.year}년 {selectedTerm.semester}학기 프로젝트</p>
            <p className={`text-xl md:text-2xl font-bold tracking-[-0.02em] truncate ${projectTitle ? "text-[#1D1D1F]" : "text-[#C7C7CC]"}`}>
              {projectTitle || "아직 프로젝트 명이 없어요"}
            </p>
            <p className="text-xs text-[#8E8E93] mt-1">프로젝트 명은 {selectedTerm.semester === 1 ? "3" : "9"}월 계획서에서 입력·수정해요.</p>
          </div>
          <div className="md:w-64 shrink-0">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-semibold text-[#6E6E73]">제출 진행</span>
              <span className="text-sm font-bold text-[#1D1D1F]">{submittedCount}<span className="text-[#AEAEB2] font-semibold"> / 4</span></span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {displayReports.map((r) => {
                const st = submitStateOf(r);
                return (
                  <div
                    key={r.month}
                    title={`${r.month}월 ${reportKind(r.month)}`}
                    className={`h-2 rounded-full ${st === "done" ? "bg-[#34C759]" : st === "open" ? "bg-[#0071E3]/40" : "bg-black/[0.08]"}`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {displayReports.map((r) => (
                <span key={r.month} className="text-[10px] text-center font-semibold text-[#AEAEB2]">{r.month}월</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 달 카드 */}
      <SectionTitle>총회 자료</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-10 md:mb-12">
        {displayReports.map((report) => (
          <MonthCard
            key={report.id}
            month={report.month}
            title={report.memo}
            state={submitStateOf(report)}
            date={report.date}
            startDate={report.startDate}
            endDate={report.endDate}
            onClick={() => openReport(report)}
            onDelete={canDeleteReport(report) ? () => handleDeleteReport(report) : undefined}
          />
        ))}
      </div>

      {/* 관련 링크 — 커뮤니티에서 내 페이지를 연 사람에게 버튼으로 보여요 */}
      <SectionTitle
        right={
          <button
            onClick={handleSaveLinks}
            disabled={isLinksSaving}
            className="h-8 px-3.5 rounded-full bg-[#0071E3] text-white text-xs font-semibold hover:bg-[#0077ED] disabled:opacity-50 transition-colors"
          >
            {isLinksSaving ? "저장 중..." : "저장"}
          </button>
        }
      >
        관련 링크
      </SectionTitle>
      <div className={`${CARD} rounded-3xl p-4 md:p-5`}>
        <p className="text-xs text-[#8E8E93] mb-3 px-1 flex items-center gap-1.5"><Link2 size={13} /> Git, Notion 등 — 커뮤니티의 내 페이지에 버튼으로 보여요.</p>
        <div className="space-y-2">
          {projectLinks.map((link, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLinkField(idx, "label", e.target.value)}
                placeholder="이름"
                className="w-24 md:w-36 shrink-0 h-10 px-3 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-semibold text-sm text-[#1D1D1F]"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLinkField(idx, "url", e.target.value)}
                placeholder="https://..."
                className="flex-1 min-w-0 h-10 px-3 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 text-sm text-[#1D1D1F]"
              />
              <button onClick={() => removeLinkRow(idx)} aria-label="링크 삭제" className="w-8 h-8 rounded-full flex items-center justify-center text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.06] shrink-0 transition-colors">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addLinkRow} className="flex items-center gap-1 mt-3 px-1 text-xs font-semibold text-[#0071E3] hover:underline">
          <Plus size={13} /> 링크 추가
        </button>
      </div>

      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", stiffness: 400, damping: 34 }} className="relative w-full max-w-lg bg-[#fff] rounded-[28px] p-5 md:p-7 shadow-[0_20px_60px_rgb(0_0_0/0.18)] overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-xs font-semibold text-[#8E8E93]">{selectedReport.month}월 {reportKind(selectedReport.month)}</p>
                  <h3 className="text-xl md:text-2xl font-bold text-[#1D1D1F] tracking-[-0.02em] mt-0.5">
                    {isSubmittedStatus(selectedReport.status) ? (selectedReport.isWithinPeriod ? "제출 내용 수정" : "제출 자료 확인") : "자료 제출"}
                  </h3>
                </div>
                <button onClick={() => setSelectedReport(null)} aria-label="닫기" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center hover:bg-black/[0.08] shrink-0"><X size={16} /></button>
              </div>

              {!selectedReport.isWithinPeriod && (
                <div className="mb-5 p-3 bg-black/[0.04] rounded-2xl flex items-center gap-2.5 text-[#6E6E73]">
                  <Lock size={15} className="shrink-0" />
                  <p className="text-xs font-semibold">지금은 제출·수정 기간이 아니에요. 읽기 전용이에요.</p>
                </div>
              )}

              <div className="mb-5">
                <p className="flex items-center gap-1.5 mb-2 ml-1 text-xs font-semibold text-[#6E6E73]"><MessageCircle size={13} /> 활동 요약</p>
                <textarea
                  value={submissionMemo}
                  onChange={(e) => setSubmissionMemo(e.target.value)}
                  disabled={!selectedReport.isWithinPeriod}
                  placeholder="이번 달에 한 활동을 짧게 적어주세요."
                  className="w-full p-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 text-sm text-[#1D1D1F] min-h-[90px] disabled:opacity-50 resize-none"
                />
              </div>

              <p className="text-xs font-semibold text-[#6E6E73] ml-1 mb-2">파일 <span className="text-[#AEAEB2] font-medium">· 하나 이상 필요 · 끌어다 놓아도 돼요</span></p>
              <div className="space-y-2 mb-6">
                <input type="file" accept=".ppt,.pptx" ref={fileRefs.presentation} className="hidden" onChange={handlePresentationFileChange} />
                <input type="file" accept=".pdf" ref={fileRefs.pdf} className="hidden" onChange={handlePdfFileChange} />
                <input type="file" ref={fileRefs.other} className="hidden" onChange={(e) => setUploadedFiles({ ...uploadedFiles, other: e.target.files![0] })} />

                <FileDropZone inputRef={fileRefs.presentation} disabled={!selectedReport.isWithinPeriod} label="발표자료 파일을 놓으세요">
                  <UploadSlot label="발표자료" disabled={!selectedReport.isWithinPeriod} existingPath={selectedReport.presentationPath} fileName={uploadedFiles.presentation?.name} onDownload={() => handleDownload(selectedReport.presentationPath)} onClick={() => selectedReport.isWithinPeriod && fileRefs.presentation.current?.click()} />
                </FileDropZone>
                <FileDropZone inputRef={fileRefs.pdf} disabled={!selectedReport.isWithinPeriod} label="PDF 파일을 놓으세요">
                  <UploadSlot label="PDF" disabled={!selectedReport.isWithinPeriod} existingPath={selectedReport.pdfPath} fileName={uploadedFiles.pdf?.name} onDownload={() => handleDownload(selectedReport.pdfPath)} onClick={() => selectedReport.isWithinPeriod && fileRefs.pdf.current?.click()} />
                </FileDropZone>
                <FileDropZone inputRef={fileRefs.other} disabled={!selectedReport.isWithinPeriod} label="기타 자료 파일을 놓으세요">
                  <UploadSlot label="기타 자료" disabled={!selectedReport.isWithinPeriod} existingPath={selectedReport.otherPath} fileName={uploadedFiles.other?.name} onDownload={() => handleDownload(selectedReport.otherPath)} onClick={() => selectedReport.isWithinPeriod && fileRefs.other.current?.click()} />
                </FileDropZone>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setSelectedReport(null)} className="flex-1 h-12 rounded-2xl bg-black/[0.05] text-[#1D1D1F] font-semibold text-sm hover:bg-black/[0.08] transition-colors">닫기</button>
                {selectedReport.isWithinPeriod && (
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isLoading}
                    className={`flex-[2] h-12 rounded-2xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${canSubmit && !isLoading ? "bg-[#0071E3] text-white hover:bg-[#0077ED]" : "bg-black/[0.05] text-[#AEAEB2] cursor-not-allowed"}`}
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : (isSubmittedStatus(selectedReport.status) ? "수정 저장" : "제출하기")}
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

const UploadSlot = ({ label, fileName, onClick, disabled, existingPath, onDownload }: any) => {
  const has = Boolean(fileName || existingPath);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors ${disabled ? "" : "cursor-pointer"} ${
        has ? "bg-[#0071E3]/[0.05] border-[#0071E3]/20" : "bg-[#F5F5F7] border-transparent hover:border-black/[0.08]"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${has ? "bg-[#0071E3] text-white" : "bg-[#fff] text-[#8E8E93] border border-black/[0.06]"}`}>
          {label === "발표자료" ? <Presentation size={16} /> : label === "PDF" ? <FileText size={16} /> : <FileArchive size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1D1D1F]">{label}</p>
          <p className="text-[11px] text-[#8E8E93] truncate max-w-[180px] md:max-w-[240px]">
            {fileName || (existingPath ? "올린 파일 있음" : disabled ? "자료 없음" : label === "발표자료" ? ".ppt, .pptx" : label === "PDF" ? ".pdf" : "형식 자유")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {existingPath && (
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            aria-label="내려받기"
            className="w-8 h-8 rounded-full bg-[#fff] text-[#0071E3] border border-black/[0.06] flex items-center justify-center"
          >
            <Download size={14} />
          </button>
        )}
        {!disabled && (
          <span className="w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
            <Upload size={14} />
          </span>
        )}
      </div>
    </div>
  );
};
