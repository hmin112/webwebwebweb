import { api } from "../../../api/axios";
import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Crown, UserPlus, X, LogOut, Trash2, Loader2,
  Mail, Search, PlusCircle, Save, Edit2, Users, CalendarDays, ChevronDown,
  FileText, Check, Clock, Presentation, Download, Upload, FileArchive, MessageCircle, Lock,
} from "lucide-react";

// ✨ CommunityTab과 동일한 학번 포맷 규칙 (8자리 학번 -> 2자리 연도 등)
const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

const isSubmittedStatus = (status?: string) => status === "SUBMITTED" || status === "제출완료";
// 3월/9월 = 계획서 달. 이 달만 파일 업로드 대신 팀 전용 계획서 작성 페이지로 이동.
const isPlanMonth = (month: number) => month === 3 || month === 9;

export const TeamTab = ({
  loginId,
  onNavigate,
  onOpenTeamPlanEditor,
}: {
  loginId: string;
  onNavigate?: (page: string, identifier?: string) => void;
  onOpenTeamPlanEditor?: (submission: any, team: any) => void;
}) => {
  // ✨ 마이페이지와 동일한 연도/학기 계산 및 선택 로직 (2~7월: 1학기, 그 외: 2학기)
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

  const [team, setTeam] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");

  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false);
  const [projectTitleDraft, setProjectTitleDraft] = useState("");

  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [teamSearch, setTeamSearch] = useState("");

  // ✨ [신규] 팀 공유 자료 — 개인 마이페이지와 완전히 독립된 별도 제출 트랙
  const [teamSubmissions, setTeamSubmissions] = useState<any[]>([]);
  const [submissionPeriods, setSubmissionPeriods] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [submissionMemo, setSubmissionMemo] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<{ presentation: File | null; pdf: File | null; other: File | null }>({ presentation: null, pdf: null, other: null });
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  const fileRefs = {
    presentation: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  };

  const isLeader = Boolean(team && team.leaderLoginId === loginId);

  const fetchStatus = async () => {
    if (!loginId || loginId === "undefined") return;
    setIsLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        api.get("/teams/my", { params: { loginId, year: selectedTerm.year, semester: selectedTerm.semester } }),
        api.get("/teams", { params: { year: selectedTerm.year, semester: selectedTerm.semester } })
      ]);
      setTeam(myRes.data.team);
      setInvitations(myRes.data.pendingInvitations || []);
      setAllTeams(allRes.data || []);
    } catch (e) {
      console.error("팀 정보 로드 실패:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [loginId, selectedTerm]);

  const fetchTeamSubmissions = async () => {
    if (!team) {
      setTeamSubmissions([]);
      return;
    }
    try {
      const [subsRes, periodRes] = await Promise.all([
        api.get("/team-submissions/my", { params: { teamId: team.teamId, year: selectedTerm.year, semester: selectedTerm.semester } }),
        api.get(`/assembly/periods/${selectedTerm.year}`),
      ]);
      setTeamSubmissions(subsRes.data || []);
      setSubmissionPeriods(periodRes.data || []);
    } catch (e) {
      console.error("팀 공유 자료 로드 실패:", e);
    }
  };

  useEffect(() => { fetchTeamSubmissions(); }, [team?.teamId, selectedTerm]);

  const displaySubmissions = useMemo(() => {
    if (!team) return [];
    const targetMonths = selectedTerm.semester === 1 ? [3, 4, 5, 6] : [9, 10, 11, 12];
    const today = new Date().toISOString().split("T")[0];

    return targetMonths.map((month) => {
      const serverData = teamSubmissions.find((s: any) =>
        Number(s.month) === Number(month) &&
        Number(s.year) === Number(selectedTerm.year) &&
        Number(s.semester) === Number(selectedTerm.semester)
      );

      const periodInfo = submissionPeriods.find((p: any) =>
        Number(p.month) === Number(month) && Number(p.semester) === Number(selectedTerm.semester)
      );

      const isWithinPeriod = periodInfo ? (today >= periodInfo.startDate && today <= periodInfo.endDate) : false;
      const isPast = periodInfo ? (today > periodInfo.endDate) : false;

      const baseData = serverData || {
        id: `temp-${month}`,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        month,
        type: month === 3 || month === 9 ? "계획서" : month === 6 || month === 12 ? "결과물" : "진행보고",
        status: "NOT_SUBMITTED",
      };

      return { ...baseData, isWithinPeriod, isPast, startDate: periodInfo?.startDate, endDate: periodInfo?.endDate };
    });
  }, [teamSubmissions, selectedTerm, submissionPeriods, team]);

  const handleSubmissionCardClick = (submission: any) => {
    if (isPlanMonth(submission.month)) {
      onOpenTeamPlanEditor?.(submission, team);
      return;
    }
    setSelectedSubmission(submission);
    setSubmissionMemo(submission.memo || "");
    setUploadedFiles({ presentation: null, pdf: null, other: null });
  };

  const canSubmitFile = useMemo(() => {
    if (!selectedSubmission || !selectedSubmission.isWithinPeriod) return false;
    const hasNewFile = Boolean(uploadedFiles.presentation || uploadedFiles.pdf || uploadedFiles.other);
    const hasExistingFile = Boolean(selectedSubmission.presentationPath || selectedSubmission.pdfPath || selectedSubmission.otherPath);
    return hasNewFile || hasExistingFile;
  }, [uploadedFiles, selectedSubmission]);

  const handlePresentationFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) { setUploadedFiles({ ...uploadedFiles, presentation: null }); return; }
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
    if (!file) { setUploadedFiles({ ...uploadedFiles, pdf: null }); return; }
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

  const handleDownloadFile = async (path: string) => {
    if (!path) return;
    try {
      const response = await api.get("/assembly/download", { params: { path }, responseType: "blob" });
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

  const handleSubmitTeamFiles = async () => {
    const hasNewFile = Boolean(uploadedFiles.presentation || uploadedFiles.pdf || uploadedFiles.other);
    const hasExistingFile = Boolean(selectedSubmission?.presentationPath || selectedSubmission?.pdfPath || selectedSubmission?.otherPath);
    if (!hasNewFile && !hasExistingFile) {
      alert("발표자료, PDF, 기타자료 중 하나 이상 업로드해 주세요.");
      return;
    }
    setIsSubmittingFile(true);
    try {
      const formData = new FormData();
      formData.append("loginId", loginId);
      formData.append("teamId", String(team.teamId));
      const sId = selectedSubmission.id?.toString() || "0";
      formData.append("submissionId", sId.includes("temp") ? "0" : sId);
      formData.append("month", selectedSubmission.month.toString());
      formData.append("year", selectedTerm.year.toString());
      formData.append("semester", selectedTerm.semester.toString());
      formData.append("memo", submissionMemo);
      if (uploadedFiles.presentation) formData.append("presentation", uploadedFiles.presentation);
      if (uploadedFiles.pdf) formData.append("pdf", uploadedFiles.pdf);
      if (uploadedFiles.other) formData.append("other", uploadedFiles.other);
      await api.post("/team-submissions/submit", formData);
      alert("팀 공유 자료가 제출되었습니다! 🎉");
      setSelectedSubmission(null);
      await fetchTeamSubmissions();
    } catch (e: any) {
      alert(`제출 실패: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsSubmittingFile(false);
    }
  };

  const otherTeams = useMemo(() => {
    return allTeams
      .filter((t) => !team || t.teamId !== team.teamId)
      .filter((t) => {
        if (!teamSearch) return true;
        const q = teamSearch.toLowerCase();
        return (
          (t.teamName || "").toLowerCase().includes(q) ||
          (t.projectTitle || "").toLowerCase().includes(q) ||
          (t.members || []).some((m: any) => (m.name || "").toLowerCase().includes(q))
        );
      });
  }, [allTeams, team, teamSearch]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert("팀 이름을 입력해주세요.");
      return;
    }
    if (!newProjectTitle.trim()) {
      alert("프로젝트 명을 입력해주세요.");
      return;
    }
    try {
      await api.post("/teams", {
        loginId,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        teamName: newTeamName.trim(),
        projectTitle: newProjectTitle.trim()
      });
      setNewTeamName("");
      setNewProjectTitle("");
      setIsCreating(false);
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "팀 생성에 실패했습니다.");
    }
  };

  const handleAccept = async (teamMemberId: number) => {
    try {
      await api.post(`/teams/invitations/${teamMemberId}/accept`, null, { params: { loginId } });
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "수락에 실패했습니다.");
    }
  };

  const handleDecline = async (teamMemberId: number) => {
    if (!confirm("초대를 거절하시겠습니까?")) return;
    try {
      await api.post(`/teams/invitations/${teamMemberId}/decline`, null, { params: { loginId } });
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "거절에 실패했습니다.");
    }
  };

  const openInviteModal = async () => {
    setIsInviteOpen(true);
    setInviteSearch("");
    try {
      const res = await api.get("/members/all");
      setAllMembers(res.data || []);
    } catch (e) {
      console.error("부원 목록 로드 실패:", e);
    }
  };

  const handleInvite = async (targetLoginId: string) => {
    try {
      await api.post(`/teams/${team.teamId}/invite`, { requesterLoginId: loginId, targetLoginId });
      alert("초대를 보냈습니다.");
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "초대에 실패했습니다.");
    }
  };

  const handleRemoveMember = async (targetLoginId: string) => {
    if (!confirm("정말 이 팀원을 내보내시겠습니까?")) return;
    try {
      await api.delete(`/teams/${team.teamId}/members/${targetLoginId}`, {
        params: { requesterLoginId: loginId }
      });
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "처리에 실패했습니다.");
    }
  };

  const handleLeaveTeam = async () => {
    if (!confirm("팀에서 나가시겠습니까?")) return;
    try {
      await api.delete(`/teams/${team.teamId}/members/${loginId}`, {
        params: { requesterLoginId: loginId }
      });
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "처리에 실패했습니다.");
    }
  };

  const handleDisband = async () => {
    if (!confirm("팀을 해체하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      await api.delete(`/teams/${team.teamId}`, { params: { requesterLoginId: loginId } });
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "처리에 실패했습니다.");
    }
  };

  const handleSaveTeamName = async () => {
    if (!teamNameDraft.trim()) {
      alert("팀 이름을 입력해주세요.");
      return;
    }
    try {
      await api.post(`/teams/${team.teamId}/title`, { requesterLoginId: loginId, teamName: teamNameDraft.trim() });
      setIsEditingTeamName(false);
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "수정에 실패했습니다.");
    }
  };

  const handleSaveProjectTitle = async () => {
    if (!projectTitleDraft.trim()) {
      alert("프로젝트 명을 입력해주세요.");
      return;
    }
    try {
      await api.post(`/teams/${team.teamId}/title`, { requesterLoginId: loginId, projectTitle: projectTitleDraft.trim() });
      setIsEditingProjectTitle(false);
      await fetchStatus();
    } catch (e: any) {
      alert(e.response?.data?.message || "수정에 실패했습니다.");
    }
  };

  const teamMemberLoginIds = useMemo(
    () => new Set((team?.members || []).map((m: any) => m.loginId)),
    [team]
  );

  const filteredMembers = useMemo(() => {
    return allMembers
      .filter((m) => m.loginId !== loginId)
      .filter((m) => !teamMemberLoginIds.has(m.loginId))
      .filter((m) =>
        !inviteSearch ||
        (m.name || "").toLowerCase().includes(inviteSearch.toLowerCase()) ||
        String(m.studentId || "").includes(inviteSearch)
      );
  }, [allMembers, inviteSearch, teamMemberLoginIds, loginId]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 md:mb-12">
        <div>
          <h1 className="text-2xl md:text-4xl font-[900] text-slate-900 tracking-tighter uppercase mb-1 md:mb-2">팀 프로젝트</h1>
          <p className="text-slate-400 font-bold text-[11px] md:text-sm">
            팀 공유 자료는 개인 마이페이지와 별개로 운영됩니다 — 팀원 누구나 아래 "팀 공유 자료"에서
            함께 제출하고, 개인 마이페이지 제출은 그대로 각자 유지돼요.
          </p>
        </div>
        <div className="relative h-12 md:h-14 w-full sm:w-auto">
          <div className="flex items-center gap-2 md:gap-3 bg-white px-4 md:px-5 h-full rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
            <CalendarDays className="text-indigo-600 shrink-0" size={16} />
            <select
              value={`${selectedTerm.year}-${selectedTerm.semester}`}
              onChange={(e) => {
                const [y, s] = e.target.value.split("-").map(Number);
                setSelectedTerm({ year: y, semester: s });
              }}
              className="appearance-none bg-transparent border-none outline-none font-bold text-slate-900 text-xs md:text-sm pr-4 md:pr-6 cursor-pointer h-full"
            >
              {semesterOptions.map((option, idx) => (
                <option key={idx} value={`${option.year}-${option.semester}`}>{option.year}년도 {option.semester}학기</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 md:right-4 pointer-events-none text-slate-400" size={14} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <p className="text-slate-400 font-bold tracking-tight text-sm">팀 정보를 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <div className="mb-8 md:mb-10 space-y-3 md:space-y-4">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <Mail size={16} className="text-indigo-500" /> 받은 팀 초대
              </h3>
              {invitations.map((inv) => (
                <div key={inv.teamMemberId} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-indigo-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm md:text-base truncate">{inv.teamName}</p>
                    <p className="text-[11px] md:text-xs text-slate-400 font-bold truncate">프로젝트: {inv.projectTitle}</p>
                    <p className="text-xs md:text-sm text-slate-400 font-bold mt-1">{inv.leaderName} 님이 팀에 초대했습니다.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDecline(inv.teamMemberId)} className="px-4 py-2.5 rounded-xl bg-slate-50 text-slate-500 font-bold text-xs md:text-sm hover:bg-slate-100 transition-all">거절</button>
                    <button onClick={() => handleAccept(inv.teamMemberId)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs md:text-sm shadow-md hover:bg-indigo-700 transition-all">수락</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!team ? (
            <div className="bg-white rounded-2xl md:rounded-[3rem] border border-dashed border-slate-200 p-8 md:p-16 text-center">
              <Layers size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold mb-6 text-sm md:text-base leading-relaxed">
                아직 소속된 팀이 없습니다.<br />팀을 만들어 팀원들과 총회자료를 함께 제출해보세요.
              </p>
              {!isCreating ? (
                <button onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-100 text-sm transition-all active:scale-95">
                  <PlusCircle size={18} /> 새 팀 만들기
                </button>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <input
                    autoFocus
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="팀 이름"
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  />
                  <input
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                    placeholder="프로젝트 명"
                    className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  />
                  <button onClick={handleCreateTeam} className="w-full px-5 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm shadow-md transition-all active:scale-95">팀 생성</button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-12 border border-slate-100 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-8 md:mb-10">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <span className="text-[10px] md:text-xs font-black text-indigo-500 uppercase tracking-widest">Team Name</span>
                    {isEditingTeamName ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          autoFocus
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveTeamName()}
                          className="flex-1 bg-slate-50 px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg md:text-2xl text-slate-900 min-w-0"
                        />
                        <button onClick={handleSaveTeamName} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shrink-0"><Save size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-xl md:text-3xl font-black text-slate-900 truncate">{team.teamName}</h2>
                        {isLeader && (
                          <button onClick={() => { setIsEditingTeamName(true); setTeamNameDraft(team.teamName); }} className="text-slate-300 hover:text-indigo-500 shrink-0 transition-colors">
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Project Title</span>
                    {isEditingProjectTitle ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          autoFocus
                          value={projectTitleDraft}
                          onChange={(e) => setProjectTitleDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveProjectTitle()}
                          className="flex-1 bg-slate-50 px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm md:text-base text-slate-700 min-w-0"
                        />
                        <button onClick={handleSaveProjectTitle} className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shrink-0"><Save size={15} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm md:text-base font-bold text-slate-500 truncate">{team.projectTitle}</p>
                        {isLeader && (
                          <button onClick={() => { setIsEditingProjectTitle(true); setProjectTitleDraft(team.projectTitle); }} className="text-slate-300 hover:text-indigo-500 shrink-0 transition-colors">
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isLeader ? (
                  <button onClick={handleDisband} className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-pink-50 text-pink-600 font-bold text-xs md:text-sm hover:bg-pink-100 transition-all">
                    <Trash2 size={14} /> 팀 해체
                  </button>
                ) : (
                  <button onClick={handleLeaveTeam} className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-500 font-bold text-xs md:text-sm hover:bg-slate-100 transition-all">
                    <LogOut size={14} /> 팀 나가기
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">팀원 ({team.members.length})</p>
                {isLeader && (
                  <button onClick={openInviteModal} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100 transition-all">
                    <UserPlus size={14} /> 팀원 초대
                  </button>
                )}
              </div>

              <div className="space-y-2 md:space-y-3">
                {team.members.map((m: any) => (
                  <div key={m.teamMemberId} className="flex items-center justify-between gap-3 p-3.5 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                        className="w-9 h-9 md:w-11 md:h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                        alt={m.name}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-sm truncate">{formatStudentId(m.studentId)} {m.name}</span>
                          {m.isLeader && <Crown size={13} className="text-amber-500 shrink-0" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] md:text-[10px] font-black px-2 py-1 rounded-full ${m.status === "ACCEPTED" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-500"}`}>
                        {m.status === "ACCEPTED" ? "수락됨" : "대기중"}
                      </span>
                      {isLeader && !m.isLeader && (
                        <button onClick={() => handleRemoveMember(m.loginId)} className="p-1.5 text-slate-300 hover:text-pink-500 transition-colors">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✨ [신규] 팀 공유 자료 — 개인 마이페이지와 완전히 별개의 제출 트랙, 팀원 누구나 제출/수정 가능 */}
          {team && (
            <div className="mt-10 md:mt-14">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2 mb-4 md:mb-6">
                <FileText size={16} className="text-indigo-500" /> 팀 공유 자료
              </h3>
              <div className="space-y-3 md:space-y-4">
                {displaySubmissions.map((s) => (
                  <motion.div
                    key={s.id}
                    whileHover={{ scale: 1.01, y: -2 }}
                    onClick={() => handleSubmissionCardClick(s)}
                    className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group transition-all cursor-pointer hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 md:gap-6">
                      <span className={`text-lg md:text-2xl font-bold shrink-0 ${isSubmittedStatus(s.status) ? "text-indigo-600" : "text-slate-400"}`}>{s.month}월</span>
                      <div className="h-8 md:h-10 w-px bg-slate-200"></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 md:mb-1.5">
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] md:text-[10px] font-bold uppercase shrink-0 ${isSubmittedStatus(s.status) ? "bg-pink-50 text-pink-600" : "bg-slate-50 text-slate-400"}`}>{s.type}</span>
                          <h4 className="font-bold text-slate-900 text-sm md:text-lg truncate">{s.month}월 팀 자료</h4>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-[9px] md:text-[11px] text-slate-400 font-bold uppercase truncate">
                          {isSubmittedStatus(s.status) ? (
                            <span className="flex items-center gap-1 text-indigo-500"><Check size={12} /> {s.date || "최근"} 제출됨{s.updatedBy ? ` · ${s.updatedBy}` : ""}</span>
                          ) : s.isWithinPeriod ? (
                            <span className="flex items-center gap-1 text-green-500 font-black"><Clock size={12} /> 현재 제출 가능</span>
                          ) : s.isPast ? (
                            <span className="flex items-center gap-1 text-pink-500 font-black"><X size={12} /> 제출 종료</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock size={12} /> {s.startDate || "미설정"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] md:text-[10px] font-bold px-2 md:px-4 py-1.5 md:py-2 rounded-full border shrink-0 ${isSubmittedStatus(s.status) ? "text-green-600 bg-green-50 border-green-100" : s.isWithinPeriod ? "text-indigo-600 bg-indigo-50 border-indigo-100" : "text-orange-600 bg-orange-50 border-orange-100"}`}>
                      {isSubmittedStatus(s.status) ? "완료" : s.isWithinPeriod ? "가능" : "불가"}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ✨ 다른 팀 둘러보기 — 초대 대기중인 인원은 백엔드에서부터 제외되어 내려온다 */}
          <div className="mt-10 md:mt-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" /> 다른 팀 둘러보기 <span className="text-slate-300">({otherTeams.length})</span>
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="팀명, 프로젝트명 또는 팀원 이름 검색"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs shadow-sm focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>

            {otherTeams.length === 0 ? (
              <div className="bg-white rounded-2xl md:rounded-[2.5rem] border border-dashed border-slate-200 p-8 md:p-12 text-center">
                <p className="text-slate-300 font-bold text-sm">
                  {allTeams.length === 0 ? `${selectedTerm.year}년 ${selectedTerm.semester}학기에 만들어진 팀이 아직 없습니다.` : "검색 결과가 없습니다."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {otherTeams.map((t) => (
                  <div key={t.teamId} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm">
                    <p className="font-black text-slate-900 text-sm md:text-base truncate">{t.teamName}</p>
                    <p className="text-[11px] md:text-xs font-bold text-slate-400 truncate mb-3">프로젝트: {t.projectTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.members.map((m: any) => (
                        <button
                          type="button"
                          key={m.teamMemberId}
                          onClick={() => onNavigate && onNavigate("member-detail", m.loginId)}
                          className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-slate-50 rounded-full border border-slate-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
                        >
                          <img
                            src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                            alt={m.name}
                          />
                          <span className="text-[11px] font-bold text-slate-600">{formatStudentId(m.studentId)} {m.name}</span>
                          {m.isLeader && <Crown size={11} className="text-amber-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsInviteOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-black text-slate-900">팀원 초대</h3>
                <button onClick={() => setIsInviteOpen(false)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"><X size={16} /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  autoFocus
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="이름 또는 학번 검색"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredMembers.length === 0 && (
                  <p className="text-center text-slate-300 font-bold text-sm py-10">검색 결과가 없습니다.</p>
                )}
                {filteredMembers.map((m) => (
                  <div key={m.loginId} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                        alt={m.name}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{m.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{m.studentId}학번</p>
                      </div>
                    </div>
                    <button onClick={() => handleInvite(m.loginId)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shrink-0 transition-all active:scale-95">초대</button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✨ [신규] 팀 공유 자료 — 파일 업로드 모달 (진행보고/결과물 달 전용, 계획서 달은 팀 전용 페이지로 이동) */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setSelectedSubmission(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] md:text-[10px] font-bold rounded-md uppercase border border-indigo-100">{selectedSubmission.month}월 팀 자료</span>
                  <h3 className="text-xl md:text-3xl font-bold text-slate-900 mt-1 md:mt-2">
                    {isSubmittedStatus(selectedSubmission.status) ? (selectedSubmission.isWithinPeriod ? "제출 내용 수정" : "제출 자료 확인") : "팀 자료 제출"}
                  </h3>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 shrink-0"><X size={18} /></button>
              </div>

              {!selectedSubmission.isWithinPeriod && (
                <div className="mb-6 p-3 md:p-4 bg-slate-900 rounded-xl md:rounded-2xl border border-slate-800 flex items-center gap-2 md:gap-3 text-white">
                  <Lock size={16} className="text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">현재 제출 및 수정 가능 기간이 아닙니다.</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] md:text-xs text-slate-400 font-bold mb-6 md:mb-8 -mt-2">팀원 누구나 이 자료를 올리거나 수정할 수 있어요.</p>

              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-1.5 mb-2 ml-1"><MessageCircle size={14} className="text-indigo-500" /><p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">활동 요약</p></div>
                <textarea
                  value={submissionMemo}
                  onChange={(e) => setSubmissionMemo(e.target.value)}
                  disabled={!selectedSubmission.isWithinPeriod}
                  placeholder="활동 내용을 입력해주세요."
                  className="w-full p-4 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs md:text-sm min-h-[80px] md:min-h-[100px] disabled:opacity-50 resize-none"
                />
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <p className="text-[10px] md:text-xs font-bold text-slate-400 ml-1 uppercase">제출 파일 관리</p>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  <input type="file" accept=".ppt,.pptx" ref={fileRefs.presentation} className="hidden" onChange={handlePresentationFileChange} />
                  <input type="file" accept=".pdf" ref={fileRefs.pdf} className="hidden" onChange={handlePdfFileChange} />
                  <input type="file" ref={fileRefs.other} className="hidden" onChange={(e) => setUploadedFiles({ ...uploadedFiles, other: e.target.files![0] })} />

                  <UploadSlot label="발표자료" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.presentationPath} fileName={uploadedFiles.presentation?.name} onDownload={() => handleDownloadFile(selectedSubmission.presentationPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.presentation.current?.click()} />
                  <UploadSlot label="PDF" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.pdfPath} fileName={uploadedFiles.pdf?.name} onDownload={() => handleDownloadFile(selectedSubmission.pdfPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.pdf.current?.click()} />
                  <UploadSlot label="기타 자료" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.otherPath} fileName={uploadedFiles.other?.name} onDownload={() => handleDownloadFile(selectedSubmission.otherPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.other.current?.click()} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedSubmission(null)} className="flex-1 py-3.5 md:py-5 bg-slate-50 text-slate-500 rounded-xl md:rounded-2xl font-bold text-xs md:text-base hover:bg-slate-100 transition-all">닫기</button>
                {selectedSubmission.isWithinPeriod && (
                  <button
                    onClick={handleSubmitTeamFiles}
                    disabled={!canSubmitFile || isSubmittingFile}
                    className={`flex-[2] py-3.5 md:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-base transition-all flex items-center justify-center gap-2 ${canSubmitFile && !isSubmittingFile ? "bg-indigo-600 text-white shadow-xl" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  >
                    {isSubmittingFile ? <Loader2 className="animate-spin" size={18} /> : (isSubmittedStatus(selectedSubmission.status) ? "수정 저장" : "제출 완료")}
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

const UploadSlot = ({ label, fileName, onClick, disabled, existingPath, onDownload }: any) => (
  <div className={`flex items-center justify-between p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all ${fileName || existingPath ? "bg-indigo-50 border-indigo-100" : "bg-slate-50 border-slate-100"}`}>
    <div className="flex items-center gap-2 md:gap-4 min-w-0">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${fileName || existingPath ? "bg-indigo-600 text-white" : "bg-white text-slate-400 border"}`}>
        {label === "발표자료" ? <Presentation size={16} /> : label === "PDF" ? <FileText size={16} /> : <FileArchive size={16} />}
      </div>
      <div className="text-left min-w-0">
        <p className="text-[11px] md:text-sm font-bold text-slate-800">{label}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase truncate max-w-[100px] md:max-w-[150px]">{fileName || (existingPath ? "파일 있음" : "자료 없음")}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      {existingPath && (
        <button onClick={onDownload} className="p-1.5 md:p-2 bg-white text-indigo-600 rounded-lg shadow-sm border border-indigo-100 shrink-0">
          <Download size={14} />
        </button>
      )}
      {!disabled && (
        <button onClick={onClick} className="p-1.5 md:p-2 bg-indigo-600 text-white rounded-lg shadow-sm shrink-0">
          <Upload size={14} />
        </button>
      )}
    </div>
  </div>
);
