import { api } from "../../../api/axios";
import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Crown, UserPlus, X, LogOut, Trash2, Loader2, Mail, Search, PlusCircle, Save, Edit2, Users, FileText, Presentation, Download, Upload, FileArchive, MessageCircle, Lock
} from "lucide-react";
import { FileDropZone } from "../../../components/ui/FileDropZone";
import { MonthCard, PageHeader, TermSelect, reportKind, submitStateOf } from "../../assembly/assemblyUi";

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

  // ✨ [2026-09-21] 한 학기에 여러 팀 소속 가능 — 목록으로 받고, 화면은 "선택된 팀" 하나를 본다.
  // 아래 team은 선택된 팀에서 파생되므로 기존 렌더/핸들러 코드는 그대로 team을 쓰면 된다.
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isCreatingNewTeam, setIsCreatingNewTeam] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false); // 팀 생성 요청이 진행 중인지
  const [showCreateForm, setShowCreateForm] = useState(false); // 팀 이름/프로젝트 명 입력 폼 열림 여부
  const createTeamLockRef = useRef(false);

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
  const submitFileLockRef = useRef(false);
  const fileRefs = {
    presentation: useRef<HTMLInputElement>(null),
    pdf: useRef<HTMLInputElement>(null),
    other: useRef<HTMLInputElement>(null),
  };

  const team = useMemo(
    () => teams.find((t) => t.teamId === selectedTeamId) ?? teams[0] ?? null,
    [teams, selectedTeamId]
  );
  const isLeader = Boolean(team && team.leaderLoginId === loginId);

  const fetchStatus = async () => {
    if (!loginId || loginId === "undefined") return;
    setIsLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        api.get("/teams/my", { params: { loginId, year: selectedTerm.year, semester: selectedTerm.semester } }),
        api.get("/teams", { params: { year: selectedTerm.year, semester: selectedTerm.semester } })
      ]);
      const myTeams = myRes.data.teams || [];
      setTeams(myTeams);
      // 보고 있던 팀이 사라졌으면(해체/탈퇴) 첫 번째 팀으로 되돌린다
      setSelectedTeamId((prev) =>
        prev && myTeams.some((t: any) => t.teamId === prev) ? prev : (myTeams[0]?.teamId ?? null)
      );
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
    if (submitFileLockRef.current) return;
    const hasNewFile = Boolean(uploadedFiles.presentation || uploadedFiles.pdf || uploadedFiles.other);
    const hasExistingFile = Boolean(selectedSubmission?.presentationPath || selectedSubmission?.pdfPath || selectedSubmission?.otherPath);
    if (!hasNewFile && !hasExistingFile) {
      alert("발표자료, PDF, 기타자료 중 하나 이상 업로드해 주세요.");
      return;
    }
    submitFileLockRef.current = true;
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
      submitFileLockRef.current = false;
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
    if (createTeamLockRef.current) return;
    if (!newTeamName.trim()) {
      alert("팀 이름을 입력해주세요.");
      return;
    }
    if (!newProjectTitle.trim()) {
      alert("프로젝트 명을 입력해주세요.");
      return;
    }
    createTeamLockRef.current = true;
    setIsCreating(true);
    try {
      const created = await api.post("/teams", {
        loginId,
        year: selectedTerm.year,
        semester: selectedTerm.semester,
        teamName: newTeamName.trim(),
        projectTitle: newProjectTitle.trim()
      });
      setNewTeamName("");
      setNewProjectTitle("");
      setShowCreateForm(false);
      setIsCreatingNewTeam(false);
      await fetchStatus();
      // 방금 만든 팀을 바로 보여준다
      if (created.data?.teamId) setSelectedTeamId(created.data.teamId);
    } catch (e: any) {
      alert(e.response?.data?.message || "팀 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
      createTeamLockRef.current = false;
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
      <PageHeader
        title="팀 프로젝트"
        desc="팀을 만들고 팀원과 함께 팀 자료를 제출해요. 개인 마이 페이지 제출과는 따로 관리돼요."
        right={<TermSelect value={selectedTerm} options={semesterOptions} onChange={setSelectedTerm} />}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
          <Loader2 className="animate-spin text-[#0071E3]" size={32} />
          <p className="text-[#8E8E93] font-bold tracking-tight text-sm">팀 정보를 불러오는 중입니다...</p>
        </div>
      ) : (
        <>
          {invitations.length > 0 && (
            <div className="mb-8 md:mb-10 space-y-3 md:space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em] flex items-center gap-2">
                <Mail size={16} className="text-[#0071E3]" /> 받은 팀 초대
              </h3>
              {invitations.map((inv) => (
                <div key={inv.teamMemberId} className="bg-[#fff] p-4 md:p-6 rounded-3xl border border-[#0071E3]/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1D1D1F] text-sm md:text-base truncate">{inv.teamName}</p>
                    <p className="text-[11px] md:text-xs text-[#8E8E93] font-bold truncate">프로젝트: {inv.projectTitle}</p>
                    <p className="text-xs md:text-sm text-[#8E8E93] font-bold mt-1">{inv.leaderName} 님이 팀에 초대했습니다.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDecline(inv.teamMemberId)} className="px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-[#6E6E73] font-bold text-xs md:text-sm hover:bg-black/[0.06] transition-all">거절</button>
                    <button onClick={() => handleAccept(inv.teamMemberId)} className="px-4 py-2.5 rounded-xl bg-[#0071E3] text-white font-bold text-xs md:text-sm shadow-md hover:bg-[#0077ED] transition-all">수락</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ✨ [2026-09-21] 내가 속한 팀 목록 — 여러 팀에 동시에 속할 수 있어 선택해서 본다 */}
          {teams.length > 0 && !isCreatingNewTeam && (
            <div className="flex items-center gap-2 mb-4 md:mb-6 overflow-x-auto no-scrollbar">
              {teams.map((t: any) => (
                <button
                  key={t.teamId}
                  onClick={() => setSelectedTeamId(t.teamId)}
                  className={`px-4 py-2.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap transition-all border ${
                    team?.teamId === t.teamId
                      ? "bg-[#1D1D1F] text-white border-[#1D1D1F]"
                      : "bg-[#fff] text-[#6E6E73] border-black/[0.06] hover:bg-black/[0.04]"
                  }`}
                >
                  {t.teamName}
                  {t.leaderLoginId === loginId && <Crown size={11} className="inline ml-1.5 -mt-0.5" />}
                </button>
              ))}
              <button
                onClick={() => { setIsCreatingNewTeam(true); setShowCreateForm(true); }}
                className="px-4 py-2.5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap bg-[#fff] text-[#0071E3] border border-[#0071E3]/20 hover:bg-[#0071E3]/10 transition-all shrink-0"
              >
                <PlusCircle size={13} className="inline mr-1 -mt-0.5" /> 새 팀
              </button>
            </div>
          )}

          {(!team || isCreatingNewTeam) ? (
            <div className="bg-[#fff] rounded-3xl border border-dashed border-black/[0.08] p-8 md:p-16 text-center">
              <Layers size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-[#6E6E73] font-bold mb-6 text-sm md:text-base leading-relaxed">
                {teams.length > 0
                  ? <>새로운 팀을 하나 더 만들 수 있어요.<br />여러 팀에 동시에 참여할 수 있습니다.</>
                  : <>아직 소속된 팀이 없습니다.<br />팀을 만들어 팀원들과 총회자료를 함께 제출해보세요.</>}
              </p>
              {!showCreateForm ? (
                <button onClick={() => setShowCreateForm(true)} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0071E3] text-white font-bold text-sm transition-all active:scale-95">
                  <PlusCircle size={18} /> 새 팀 만들기
                </button>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <input
                    autoFocus
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="팀 이름"
                    className="w-full px-4 py-3.5 bg-[#F5F5F7] rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                  />
                  <input
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                    placeholder="프로젝트 명"
                    className="w-full px-4 py-3.5 bg-[#F5F5F7] rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                  />
                  <button disabled={isCreating} onClick={handleCreateTeam} className="w-full px-5 py-3.5 rounded-2xl bg-[#0071E3] text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-60">{isCreating ? "생성 중..." : "팀 생성"}</button>
                  {teams.length > 0 && (
                    <button onClick={() => { setIsCreatingNewTeam(false); setShowCreateForm(false); }} className="w-full px-5 py-3 rounded-2xl bg-[#F5F5F7] text-[#8E8E93] font-bold text-sm">취소</button>
                  )}
                </div>
              )}
              {teams.length > 0 && !showCreateForm && (
                <button onClick={() => setIsCreatingNewTeam(false)} className="block mx-auto mt-3 text-[#8E8E93] font-bold text-xs hover:text-[#3A3A3C]">
                  내 팀으로 돌아가기
                </button>
              )}
            </div>
          ) : (
            <div className="bg-[#fff] rounded-3xl p-6 md:p-12 border border-black/[0.06] shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-8 md:mb-10">
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#8E8E93]">팀 이름</span>
                    {isEditingTeamName ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          autoFocus
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveTeamName()}
                          className="flex-1 bg-[#F5F5F7] px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-lg md:text-2xl text-[#1D1D1F] min-w-0"
                        />
                        <button onClick={handleSaveTeamName} className="p-2.5 bg-[#0071E3] text-white rounded-xl shadow-md shrink-0"><Save size={18} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-xl md:text-3xl font-bold text-[#1D1D1F] truncate">{team.teamName}</h2>
                        {isLeader && (
                          <button onClick={() => { setIsEditingTeamName(true); setTeamNameDraft(team.teamName); }} className="text-[#C7C7CC] hover:text-[#0071E3] shrink-0 transition-colors">
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#8E8E93]">프로젝트</span>
                    {isEditingProjectTitle ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          autoFocus
                          value={projectTitleDraft}
                          onChange={(e) => setProjectTitleDraft(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveProjectTitle()}
                          className="flex-1 bg-[#F5F5F7] px-3.5 py-2 rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm md:text-base text-[#1D1D1F] min-w-0"
                        />
                        <button onClick={handleSaveProjectTitle} className="p-2 bg-[#0071E3] text-white rounded-xl shadow-md shrink-0"><Save size={15} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm md:text-base font-bold text-[#6E6E73] truncate">{team.projectTitle}</p>
                        {isLeader && (
                          <button onClick={() => { setIsEditingProjectTitle(true); setProjectTitleDraft(team.projectTitle); }} className="text-[#C7C7CC] hover:text-[#0071E3] shrink-0 transition-colors">
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {isLeader ? (
                  <button onClick={handleDisband} className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF3B30]/[0.08] text-[#FF3B30] font-bold text-xs md:text-sm hover:bg-[#FF3B30]/[0.12] transition-all">
                    <Trash2 size={14} /> 팀 해체
                  </button>
                ) : (
                  <button onClick={handleLeaveTeam} className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-[#6E6E73] font-bold text-xs md:text-sm hover:bg-black/[0.06] transition-all">
                    <LogOut size={14} /> 팀 나가기
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] md:text-xs font-bold text-[#8E8E93] uppercase tracking-widest">팀원 ({team.members.length})</p>
                {isLeader && (
                  <button onClick={openInviteModal} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] font-bold text-xs hover:bg-[#0071E3]/15 transition-all">
                    <UserPlus size={14} /> 팀원 초대
                  </button>
                )}
              </div>

              <div className="space-y-2 md:space-y-3">
                {team.members.map((m: any) => (
                  <div key={m.teamMemberId} className="flex items-center justify-between gap-3 p-3.5 md:p-4 bg-[#F5F5F7] rounded-xl md:rounded-2xl border border-black/[0.06]">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                        className="w-9 h-9 md:w-11 md:h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                        alt={m.name}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#1D1D1F] text-sm truncate">{formatStudentId(m.studentId)} {m.name}</span>
                          {m.isLeader && <Crown size={13} className="text-[#FF9500] shrink-0" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full ${m.status === "ACCEPTED" ? "bg-[#34C759]/10 text-[#248A3D]" : "bg-[#FF9500]/10 text-[#C93400]"}`}>
                        {m.status === "ACCEPTED" ? "수락됨" : "대기중"}
                      </span>
                      {isLeader && !m.isLeader && (
                        <button onClick={() => handleRemoveMember(m.loginId)} className="p-1.5 text-[#C7C7CC] hover:text-[#FF3B30] transition-colors">
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
              <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em] flex items-center gap-2 mb-4 md:mb-6">
                <FileText size={16} className="text-[#0071E3]" /> 팀 공유 자료
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {displaySubmissions.map((sub) => (
                  <MonthCard
                    key={sub.id}
                    month={sub.month}
                    title={sub.memo || `${sub.month}월 ${reportKind(sub.month)}`}
                    state={submitStateOf(sub)}
                    date={sub.date}
                    startDate={sub.startDate}
                    endDate={sub.endDate}
                    extra={sub.updatedBy || undefined}
                    onClick={() => handleSubmissionCardClick(sub)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ✨ 다른 팀 둘러보기 — 초대 대기중인 인원은 백엔드에서부터 제외되어 내려온다 */}
          <div className="mt-10 md:mt-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em] flex items-center gap-2">
                <Users size={16} className="text-[#0071E3]" /> 다른 팀 둘러보기 <span className="text-[#C7C7CC]">({otherTeams.length})</span>
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C7C7CC]" size={14} />
                <input
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="팀명, 프로젝트명 또는 팀원 이름 검색"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#fff] border border-black/[0.08] rounded-xl outline-none font-bold text-xs shadow-sm focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
                />
              </div>
            </div>

            {otherTeams.length === 0 ? (
              <div className="bg-[#fff] rounded-3xl border border-dashed border-black/[0.08] p-8 md:p-12 text-center">
                <p className="text-[#C7C7CC] font-bold text-sm">
                  {allTeams.length === 0 ? `${selectedTerm.year}년 ${selectedTerm.semester}학기에 만들어진 팀이 아직 없습니다.` : "검색 결과가 없습니다."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {otherTeams.map((t) => (
                  <div key={t.teamId} className="bg-[#fff] p-4 md:p-6 rounded-3xl border border-black/[0.06] shadow-sm">
                    <p className="font-bold text-[#1D1D1F] text-sm md:text-base truncate">{t.teamName}</p>
                    <p className="text-[11px] md:text-xs font-bold text-[#8E8E93] truncate mb-3">프로젝트: {t.projectTitle}</p>
                    <div className="flex flex-wrap gap-2">
                      {t.members.map((m: any) => (
                        <button
                          type="button"
                          key={m.teamMemberId}
                          onClick={() => onNavigate && onNavigate("member-detail", m.loginId)}
                          className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-[#F5F5F7] rounded-full border border-black/[0.06] hover:bg-[#0071E3]/10 hover:border-[#0071E3]/20 transition-colors"
                        >
                          <img
                            src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                            alt={m.name}
                          />
                          <span className="text-[11px] font-bold text-[#3A3A3C]">{formatStudentId(m.studentId)} {m.name}</span>
                          {m.isLeader && <Crown size={11} className="text-[#FF9500] shrink-0" />}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsInviteOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-[#fff] rounded-[28px] p-6 md:p-8 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F]">팀원 초대</h3>
                <button onClick={() => setIsInviteOpen(false)} className="p-2 bg-[#F5F5F7] text-[#8E8E93] rounded-xl hover:bg-black/[0.06] transition-colors"><X size={16} /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C7C7CC]" size={16} />
                <input
                  autoFocus
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  placeholder="이름 또는 학번 검색"
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredMembers.length === 0 && (
                  <p className="text-center text-[#C7C7CC] font-bold text-sm py-10">검색 결과가 없습니다.</p>
                )}
                {filteredMembers.map((m) => (
                  <div key={m.loginId} className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-black/[0.04] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                        onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                        alt={m.name}
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-[#1D1D1F] text-sm truncate">{m.name}</p>
                        <p className="text-[10px] text-[#8E8E93] font-bold">{m.studentId}학번</p>
                      </div>
                    </div>
                    <button onClick={() => handleInvite(m.loginId)} className="px-3 py-1.5 rounded-lg bg-[#0071E3] text-white font-bold text-xs shrink-0 transition-all active:scale-95">초대</button>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedSubmission(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-xl bg-[#fff] rounded-[28px] p-6 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <span className="px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] text-[9px] md:text-[10px] font-bold rounded-md uppercase border border-[#0071E3]/20">{selectedSubmission.month}월 팀 자료</span>
                  <h3 className="text-xl md:text-3xl font-bold text-[#1D1D1F] mt-1 md:mt-2">
                    {isSubmittedStatus(selectedSubmission.status) ? (selectedSubmission.isWithinPeriod ? "제출 내용 수정" : "제출 자료 확인") : "팀 자료 제출"}
                  </h3>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 bg-[#F5F5F7] text-[#8E8E93] rounded-xl hover:bg-black/[0.06] shrink-0"><X size={18} /></button>
              </div>

              {!selectedSubmission.isWithinPeriod && (
                <div className="mb-6 p-3 md:p-4 bg-slate-900 rounded-xl md:rounded-2xl border border-slate-800 flex items-center gap-2 md:gap-3 text-white">
                  <Lock size={16} className="text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">현재 제출 및 수정 가능 기간이 아닙니다.</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] md:text-xs text-[#8E8E93] font-bold mb-6 md:mb-8 -mt-2">팀원 누구나 이 자료를 올리거나 수정할 수 있어요.</p>

              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-1.5 mb-2 ml-1"><MessageCircle size={14} className="text-[#0071E3]" /><p className="text-[10px] md:text-xs font-bold text-[#8E8E93] uppercase tracking-widest">활동 요약</p></div>
                <textarea
                  value={submissionMemo}
                  onChange={(e) => setSubmissionMemo(e.target.value)}
                  disabled={!selectedSubmission.isWithinPeriod}
                  placeholder="활동 내용을 입력해주세요."
                  className="w-full p-4 bg-[#F5F5F7] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-xs md:text-sm min-h-[80px] md:min-h-[100px] disabled:opacity-50 resize-none"
                />
              </div>

              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                <p className="text-[10px] md:text-xs font-bold text-[#8E8E93] ml-1 uppercase">제출 파일 관리</p>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  <input type="file" accept=".ppt,.pptx" ref={fileRefs.presentation} className="hidden" onChange={handlePresentationFileChange} />
                  <input type="file" accept=".pdf" ref={fileRefs.pdf} className="hidden" onChange={handlePdfFileChange} />
                  <input type="file" ref={fileRefs.other} className="hidden" onChange={(e) => setUploadedFiles({ ...uploadedFiles, other: e.target.files![0] })} />

                  <FileDropZone inputRef={fileRefs.presentation} disabled={!selectedSubmission.isWithinPeriod} label="발표자료 파일을 놓으세요">
                    <UploadSlot label="발표자료" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.presentationPath} fileName={uploadedFiles.presentation?.name} onDownload={() => handleDownloadFile(selectedSubmission.presentationPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.presentation.current?.click()} />
                  </FileDropZone>
                  <FileDropZone inputRef={fileRefs.pdf} disabled={!selectedSubmission.isWithinPeriod} label="PDF 파일을 놓으세요">
                    <UploadSlot label="PDF" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.pdfPath} fileName={uploadedFiles.pdf?.name} onDownload={() => handleDownloadFile(selectedSubmission.pdfPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.pdf.current?.click()} />
                  </FileDropZone>
                  <FileDropZone inputRef={fileRefs.other} disabled={!selectedSubmission.isWithinPeriod} label="기타 자료 파일을 놓으세요">
                    <UploadSlot label="기타 자료" disabled={!selectedSubmission.isWithinPeriod} existingPath={selectedSubmission.otherPath} fileName={uploadedFiles.other?.name} onDownload={() => handleDownloadFile(selectedSubmission.otherPath)} onClick={() => selectedSubmission.isWithinPeriod && fileRefs.other.current?.click()} />
                  </FileDropZone>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedSubmission(null)} className="flex-1 py-3.5 md:py-5 bg-[#F5F5F7] text-[#6E6E73] rounded-xl md:rounded-2xl font-bold text-xs md:text-base hover:bg-black/[0.06] transition-all">닫기</button>
                {selectedSubmission.isWithinPeriod && (
                  <button
                    onClick={handleSubmitTeamFiles}
                    disabled={!canSubmitFile || isSubmittingFile}
                    className={`flex-[2] py-3.5 md:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-base transition-all flex items-center justify-center gap-2 ${canSubmitFile && !isSubmittingFile ? "bg-[#0071E3] text-white shadow-xl" : "bg-black/[0.05] text-[#8E8E93] cursor-not-allowed"}`}
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
  <div className={`flex items-center justify-between p-3 md:p-5 rounded-xl md:rounded-2xl border transition-all ${fileName || existingPath ? "bg-[#0071E3]/10 border-[#0071E3]/20" : "bg-[#F5F5F7] border-black/[0.06]"}`}>
    <div className="flex items-center gap-2 md:gap-4 min-w-0">
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${fileName || existingPath ? "bg-[#0071E3] text-white" : "bg-[#fff] text-[#8E8E93] border"}`}>
        {label === "발표자료" ? <Presentation size={16} /> : label === "PDF" ? <FileText size={16} /> : <FileArchive size={16} />}
      </div>
      <div className="text-left min-w-0">
        <p className="text-[11px] md:text-sm font-bold text-[#1D1D1F]">{label}</p>
        <p className="text-[8px] md:text-[10px] font-bold text-[#8E8E93] uppercase truncate max-w-[100px] md:max-w-[150px]">{fileName || (existingPath ? "파일 있음" : disabled ? "자료 없음" : "끌어다 놓거나 선택")}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5">
      {existingPath && (
        <button onClick={onDownload} className="p-1.5 md:p-2 bg-[#fff] text-[#0071E3] rounded-lg shadow-sm border border-[#0071E3]/20 shrink-0">
          <Download size={14} />
        </button>
      )}
      {!disabled && (
        <button onClick={onClick} className="p-1.5 md:p-2 bg-[#0071E3] text-white rounded-lg shadow-sm shrink-0">
          <Upload size={14} />
        </button>
      )}
    </div>
  </div>
);
