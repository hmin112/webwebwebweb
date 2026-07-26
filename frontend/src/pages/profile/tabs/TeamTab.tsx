import { api } from "../../../api/axios";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Crown, UserPlus, X, LogOut, Trash2, Loader2,
  Mail, Search, PlusCircle, Save, Edit2, Users, CalendarDays, ChevronDown
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

export const TeamTab = ({ loginId, onNavigate }: { loginId: string; onNavigate?: (page: string, identifier?: string) => void }) => {
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
            팀으로 묶이면 팀원 중 한 명만 총회자료를 제출해도 팀 전체가 제출한 것으로 처리됩니다.
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
    </motion.div>
  );
};
