import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, ClipboardList, ShieldCheck, RefreshCcw,
  GraduationCap, School, Coffee, ListFilter,
  ArrowDownWideNarrow, ArrowUpNarrowWide, CaseSensitive,
  Download, Save, X, UserMinus, UserCheck, ChevronDown,
  Trash2, ShieldAlert, Lock, History, RotateCcw, BookOpen, ShieldBan, LogIn,
  FileText, Heart, PlusCircle, UserPlus, Globe, Calendar, Clock, AlertTriangle,
  Phone, Hash, BadgeCheck, Info, Search, Edit, FilePlus, FileX, MessageSquare, LogOut, Activity
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { api } from "../../api/axios";

// --- 1. 타입 정의 ---
type SortCriteria = "ID_DESC" | "ID_ASC" | "NAME_ASC";
type ExportScope = "ALL" | "재학생" | "휴학생" | "졸업생" | "LAB" | "대학원";

type LogType = "LOGIN" | "LOGOUT" | "SIGNUP"
  | "POST_CREATE" | "POST_UPDATE" | "POST_DELETE"
  | "COMMENT_CREATE" | "COMMENT_DELETE" | "LIKE"
  | "EVENT_CREATE" | "EVENT_UPDATE" | "EVENT_DELETE"
  | "NOTICE_CREATE" | "NOTICE_UPDATE" | "NOTICE_DELETE"
  | "ACCOUNT_SUSPEND" | "ACCOUNT_UNSUSPEND" | "ACCOUNT_RESTORE" | "ACCOUNT_DELETE" | "ACCOUNT_PERMANENT_DELETE";

interface Member {
  id: number;
  loginId?: string;
  password?: string;
  name: string;
  studentId: string;
  dept: string;
  interests?: string;
  userStatus: string;
  discordTag: string;
  suspended: boolean;
  role: string;
  profileImage?: string;
  deletedAt?: string;
}

interface AccessLog {
  id: number;
  name: string;
  studentId: string;
  type: LogType;
  ip: string;
  timestamp: string;
}

export const AdminPage = () => {
  // --- 2. 상태 관리 ---
  const [members, setMembers] = useState<Member[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [deletedMembers, setDeletedMembers] = useState<Member[]>([]);

  const [activeTab, setActiveTab] = useState<"members" | "access" | "logs">("members");
  const [sortBy, setSortBy] = useState<SortCriteria>("ID_DESC");
  const [isSyncing, setIsSyncing] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("ALL");

  const [searchQuery, setSearchQuery] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHardDelete, setIsHardDelete] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [adminPassword, setAdminPassword] = useState("");

  // --- 3. 데이터 로딩 ---
  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const memberRes = await api.get("/admin/members");
      const deletedRes = await api.get("/admin/members/deleted");
      const logRes = await api.get("/admin/logs");
      setMembers(memberRes.data);
      setDeletedMembers(deletedRes.data);
      setAccessLogs(logRes.data);
    } catch (e) {
      console.error("데이터 로드 실패", e);
    }
  };

  // --- 4. 비즈니스 로직 ---

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "-";
    return timestamp.replace("T", " ").split(".")[0];
  };

  const formatTimeOnly = (timestamp: string) => {
    if (!timestamp) return "-";
    const timePart = timestamp.includes('T') ? timestamp.split('T')[1] : timestamp.split(' ')[1];
    return timePart ? timePart.split('.')[0] : timestamp;
  };

  const groupLogsByDate = (logs: AccessLog[]) => {
    const groups: { [key: string]: AccessLog[] } = {};
    let filtered = selectedDate === "ALL"
      ? logs
      : logs.filter(log => log.timestamp.includes(selectedDate));

    if (selectedTimeRange !== "ALL") {
      filtered = filtered.filter(log => {
        const timeStr = log.timestamp.includes('T') ? log.timestamp.split('T')[1] : log.timestamp.split(' ')[1];
        const hour = parseInt(timeStr?.split(':')[0] || "0");
        if (selectedTimeRange === "MORNING") return hour >= 6 && hour < 12;
        if (selectedTimeRange === "AFTERNOON") return hour >= 12 && hour < 18;
        if (selectedTimeRange === "EVENING") return hour >= 18 && hour < 24;
        if (selectedTimeRange === "NIGHT") return hour >= 0 && hour < 6;
        return true;
      });
    }

    filtered.forEach(log => {
      const date = log.timestamp.split('T')[0] || log.timestamp.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  };

  const getAvailableDates = () => {
    const dates = accessLogs.map(log => log.timestamp.split('T')[0] || log.timestamp.split(' ')[0]);
    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  };

  const getLogStyle = (type: LogType) => {
    switch (type) {
      case "LOGIN": return { icon: <LogIn size={14} />, label: "로그인", color: "bg-green-50 text-green-600 border-green-100" };
      case "LOGOUT": return { icon: <LogOut size={14} />, label: "로그아웃", color: "bg-slate-50 text-slate-500 border-slate-100" };
      case "SIGNUP": return { icon: <UserPlus size={14} />, label: "회원가입", color: "bg-blue-50 text-blue-600 border-blue-100" };
      case "POST_CREATE": return { icon: <FilePlus size={14} />, label: "게시글 등록", color: "bg-indigo-50 text-indigo-600 border-indigo-100" };
      case "POST_UPDATE": return { icon: <Edit size={14} />, label: "게시글 수정", color: "bg-cyan-50 text-cyan-600 border-cyan-100" };
      case "POST_DELETE": return { icon: <FileX size={14} />, label: "게시글 삭제", color: "bg-rose-50 text-rose-600 border-rose-100" };
      case "COMMENT_CREATE": return { icon: <MessageSquare size={14} />, label: "댓글 작성", color: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "COMMENT_DELETE": return { icon: <X size={14} />, label: "댓글 삭제", color: "bg-orange-50 text-orange-600 border-orange-100" };
      case "LIKE": return { icon: <Heart size={14} />, label: "좋아요", color: "bg-pink-50 text-pink-600 border-pink-100" };
      case "EVENT_CREATE": return { icon: <PlusCircle size={14} />, label: "행사 등록", color: "bg-purple-50 text-purple-600 border-purple-100" };
      case "EVENT_UPDATE": return { icon: <Edit size={14} />, label: "행사 수정", color: "bg-amber-50 text-amber-600 border-amber-100" };
      case "EVENT_DELETE": return { icon: <Trash2 size={14} />, label: "행사 삭제", color: "bg-red-50 text-red-600 border-red-100" };
      case "NOTICE_CREATE": return { icon: <FileText size={14} />, label: "공지 등록", color: "bg-blue-50 text-blue-600 border-blue-100" };
      case "NOTICE_UPDATE": return { icon: <Edit size={14} />, label: "공지 수정", color: "bg-cyan-50 text-cyan-600 border-cyan-100" };
      case "NOTICE_DELETE": return { icon: <FileX size={14} />, label: "공지 삭제", color: "bg-rose-50 text-rose-600 border-rose-100" };
      case "ACCOUNT_SUSPEND": return { icon: <ShieldAlert size={14} />, label: "계정 정지", color: "bg-red-50 text-red-600 border-red-100" };
      case "ACCOUNT_UNSUSPEND": return { icon: <ShieldCheck size={14} />, label: "정지 해제", color: "bg-emerald-50 text-emerald-600 border-emerald-100" };
      case "ACCOUNT_RESTORE": return { icon: <RotateCcw size={14} />, label: "계정 복구", color: "bg-indigo-50 text-indigo-600 border-indigo-100" };
      case "ACCOUNT_DELETE": return { icon: <Trash2 size={14} />, label: "삭제 이동", color: "bg-amber-50 text-amber-600 border-amber-100" };
      case "ACCOUNT_PERMANENT_DELETE": return { icon: <ShieldBan size={14} />, label: "영구 삭제", color: "bg-slate-900 text-white border-slate-900" };
      default: return { icon: <Activity size={14} />, label: "기타 활동", color: "bg-slate-50 text-slate-500 border-slate-100" };
    }
  };

  const toggleSuspension = async (id: number) => {
    try {
      const res = await api.put(`/admin/members/${id}/suspend`);
      if (res.data.status === "success") {
        fetchAdminData();
        alert("계정 상태가 변경되었습니다.");
      }
    } catch (e) { alert("처리 실패"); }
  };

  const restoreMember = async (member: Member) => {
    if (!member.loginId) {
      alert("복구에 필요한 로그인 ID 정보가 없습니다.");
      return;
    }

    try {
      const res = await api.post("/admin/members/restore", {
        id: member.id,
        loginId: member.loginId,
        password: member.password,
        name: member.name,
        studentId: member.studentId,
        dept: member.dept,
        interests: member.interests ?? "",
        discordTag: member.discordTag,
        userStatus: member.userStatus,
        role: member.role,
        suspended: member.suspended,
        profileImage: member.profileImage ?? null
      });
      if (res.data.status === "success") {
        setDeletedMembers(prev => prev.filter(m => m.id !== member.id));
        fetchAdminData();
        alert(`${member.name} 부원의 계정이 복구되었습니다.`);
      } else {
        alert(res.data.message || "복구 실패");
      }
    } catch (e) { alert("복구 실패"); }
  };

  const initiateDelete = (member: Member, hard: boolean = false) => {
    setMemberToDelete(member);
    setIsHardDelete(hard);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;

    try {
      const verifyRes = await api.post("/admin/verify-password", {
        password: adminPassword
      });
      if (verifyRes.data.status !== "success") {
        alert("비밀번호 불일치");
        return;
      }

      await api.delete(`/admin/members/${memberToDelete.id}?hard=${isHardDelete}`);
      if (isHardDelete) {
        alert("영구 삭제되었습니다.");
      } else {
        alert("삭제 기록으로 이동되었습니다.");
      }
      fetchAdminData();
      closeDeleteModal();
    } catch (e) {
      alert("삭제 실패");
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
    setAdminPassword("");
    setIsHardDelete(false);
  };

  const getFilteredAndSortedMembers = (data: Member[]) => {
    const filtered = data.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.studentId.includes(searchQuery) ||
      m.discordTag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (sortBy === "ID_DESC") return b.studentId.localeCompare(a.studentId);
      if (sortBy === "ID_ASC") return a.studentId.localeCompare(b.studentId);
      if (sortBy === "NAME_ASC") return a.name.localeCompare(b.name);
      return 0;
    });
  };

  const isAdminMember = (member: Member) =>
    String(member.role || "").trim().toUpperCase().includes("ADMIN");

  const normalizeStatus = (value?: string) => String(value || "").trim().toUpperCase();
  const isAttendingStatus = (value?: string) => {
    const raw = String(value || "").trim();
    const upper = normalizeStatus(value);
    return raw === "재학생" || upper === "ATTENDING";
  };
  const isLeaveStatus = (value?: string) => {
    const raw = String(value || "").trim();
    const upper = normalizeStatus(value);
    return raw === "휴학생" || upper === "LEAVE";
  };
  const isLabStatus = (value?: string) => {
    const raw = String(value || "").trim();
    const upper = normalizeStatus(value);
    return raw === "LAB" || raw === "대학원" || upper === "LAB" || upper === "GRADUATE";
  };
  const isFreshmanStatus = (value?: string) => {
    const raw = String(value || "").trim();
    const upper = normalizeStatus(value);
    return raw === "신입생" || upper === "FRESHMAN" || upper === "NEWBIE" || upper === "NEW";
  };
  const isGraduateStatus = (value?: string) => {
    const raw = String(value || "").trim();
    const upper = normalizeStatus(value);
    return raw === "졸업생" || raw === "일반" || upper === "ALUMNI" || upper === "GENERAL" || upper === "GRADUATED";
  };
  const isOtherStatus = (value?: string) =>
    !isAttendingStatus(value) && !isLeaveStatus(value) && !isLabStatus(value) && !isFreshmanStatus(value) && !isGraduateStatus(value);

  const handleDiscordSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.get("/admin/sync-discord");
      if (res.data.status === "success") {
        alert("디스코드 서버 동기화 완료! ✅");
        fetchAdminData();
      } else {
        alert(`동기화 실패: ${res.data.message || "알 수 없는 오류"}`);
      }
    } catch (e) {
      alert("디스코드 봇 서버와의 통신에 실패했습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["이름,학번,학과,상태,디스코드,정지여부\n"];
    const rows = members.map(m => `${m.name},${m.studentId},${m.dept},${m.userStatus},@${m.discordTag},${m.suspended ? "정지" : "정상"}\n`);
    const blob = new Blob(["\uFEFF" + headers + rows.join("")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DEVSIGN_명단.csv`;
    link.click();
  };

  const MemberTable = ({ title, icon: Icon, data, colorClass }: any) => {
    const displayData = getFilteredAndSortedMembers(data);
    if (displayData.length === 0 && searchQuery !== "") return null;

    return (
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Icon size={20} className={colorClass} />
          <h3 className={`text-lg font-black ${colorClass} tracking-tight uppercase`}>{title} ({displayData.length})</h3>
        </div>
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-4 sm:px-8 py-5 w-[35%]">부원 정보</th>
                  <th className="px-4 sm:px-8 py-5 w-[20%]">학번</th>
                  <th className="px-4 sm:px-8 py-5 w-[25%]">디스코드</th>
                  <th className="px-4 sm:px-8 py-5 text-center w-[20%]">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {displayData.map((member: Member) => (
                  <tr
                    key={member.id}
                    /* ✨ [수정] 행 클릭 상세 페이지 이동 기능 제거 */
                    className={`transition-colors group ${member.suspended ? "bg-red-50/20" : "hover:bg-slate-50/80"}`}
                  >
                    <td className="px-4 sm:px-8 py-6">
                      <div className="flex flex-col max-w-[120px] sm:max-w-none">
                        <div className="flex items-center gap-3">
                          <span className={`font-black truncate ${member.suspended ? "text-red-600" : "text-slate-900"}`}>{member.name}</span>
                          {member.role === "ADMIN" && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] sm:text-[9px] font-black rounded uppercase shrink-0">ADMIN</span>}
                        </div>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold truncate">{member.dept}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-6 text-slate-500 font-bold tracking-wider text-xs sm:text-sm">{member.studentId}</td>
                    <td className="px-4 sm:px-8 py-6 text-indigo-600 font-bold text-xs sm:text-sm truncate">@{member.discordTag}</td>
                    <td className="px-4 sm:px-8 py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => toggleSuspension(member.id)} className={`p-2 sm:p-2.5 rounded-xl shadow-sm transition-all ${member.suspended ? "bg-indigo-600 text-white" : "bg-white text-red-500 border border-red-100 hover:bg-red-50"}`}>{member.suspended ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}</button>
                        <button onClick={() => initiateDelete(member, false)} className="p-2 sm:p-2.5 bg-white text-pink-500 border border-pink-100 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pt-32 pb-20 px-6 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><ShieldCheck size={24} /></div>
              <h1 className="text-3xl font-[900] text-slate-900 tracking-tighter uppercase">관리</h1>
            </div>
            <p className="text-slate-500 font-bold tracking-tight">부원 권한 관리 및 실시간 로그 모니터링 시스템</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={handleDiscordSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 border border-indigo-100 font-black rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50"
            >
              <RefreshCcw size={18} className={isSyncing ? "animate-spin" : ""} /> 디스코드 정보 가져오기
            </button>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"><Download size={18} /> CSV</button>
          </div>
        </div>

        <div className="flex gap-4 p-1.5 bg-slate-200/50 rounded-[1.5rem] mb-10 w-fit">
          <button onClick={() => { setActiveTab("members"); setSearchQuery(""); }} className={`px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all text-sm sm:text-base ${activeTab === "members" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}>부원 명단</button>
          <button onClick={() => { setActiveTab("access"); setSearchQuery(""); }} className={`px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all text-sm sm:text-base ${activeTab === "access" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}>통합 로그</button>
          <button onClick={() => { setActiveTab("logs"); setSearchQuery(""); }} className={`px-6 sm:px-8 py-3 rounded-2xl font-bold transition-all text-sm sm:text-base ${activeTab === "logs" ? "bg-white text-indigo-600 shadow-md" : "text-slate-500 hover:text-slate-700"}`}>삭제 기록</button>
        </div>

        {activeTab === "members" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-slate-100 w-fit shadow-sm">
                <Users size={18} className="text-indigo-600" />
                <span className="text-sm font-black text-slate-600 tracking-tight uppercase">전체 부원: <span className="text-indigo-600">{members.length}</span> 명</span>
              </div>
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="부원 이름, 학번 또는 디스코드 태그로 검색..."
                  className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all font-bold text-sm"
                />
              </div>
            </div>

            <MemberTable title="관리자" icon={ShieldCheck} data={members.filter(m => isAdminMember(m))} colorClass="text-indigo-600" />
            <MemberTable title="신입생 부원" icon={UserPlus} data={members.filter(m => isFreshmanStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-cyan-600" />
            <MemberTable title="재학 부원" icon={School} data={members.filter(m => isAttendingStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-green-600" />
            <MemberTable title="LAB / 대학원" icon={BookOpen} data={members.filter(m => isLabStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-indigo-600" />
            <MemberTable title="휴학 부원" icon={Coffee} data={members.filter(m => isLeaveStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-amber-600" />
            <MemberTable title="졸업 부원" icon={GraduationCap} data={members.filter(m => isGraduateStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-slate-400" />
            <MemberTable title="기타 상태" icon={Users} data={members.filter(m => isOtherStatus(m.userStatus) && !isAdminMember(m))} colorClass="text-slate-500" />

            {searchQuery !== "" && getFilteredAndSortedMembers(members).length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-300 font-black uppercase tracking-widest">검색 결과가 없습니다.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "access" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0"><Calendar size={18} /><span className="text-xs font-black uppercase">날짜</span></div>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedDate("ALL")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedDate === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"}`}>전체보기</button>
                  {getAvailableDates().map(date => <button key={date} onClick={() => setSelectedDate(date)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedDate === date ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"}`}>{date}</button>)}
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Clock size={18} /><span className="text-xs font-black uppercase">시간대</span></div>
                <div className="flex gap-2">
                  {[{ id: "ALL", label: "전체" }, { id: "MORNING", label: "오전" }, { id: "AFTERNOON", label: "오후" }, { id: "EVENING", label: "저녁" }, { id: "NIGHT", label: "새벽" }].map(r => (
                    <button key={r.id} onClick={() => setSelectedTimeRange(r.id)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedTimeRange === r.id ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400"}`}>{r.label}</button>
                  ))}
                </div>
              </div>
            </div>
            {Object.entries(groupLogsByDate(accessLogs)).map(([date, logs]) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-4 px-2"><div className="h-px flex-grow bg-slate-200" /><span className="text-xs font-black text-slate-400 uppercase tracking-widest">{date}</span><div className="h-px flex-grow bg-slate-200" /></div>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left table-fixed">
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map((log) => {
                        const style = getLogStyle(log.type);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6"><div className="flex flex-col"><span className="font-black text-slate-900">{log.name}</span><span className="text-[10px] text-slate-400 font-bold">{log.studentId}</span></div></td>
                            <td className="px-8 py-6 text-[11px] text-slate-400 font-bold"><Globe size={12} className="inline mr-1" /> {log.ip}</td>
                            <td className="px-8 py-6"><div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black border ${style.color}`}>{style.icon} {style.label}</div></td>
                            <td className="px-8 py-6 text-right pr-12 text-slate-500 font-bold tabular-nums">{formatTimeOnly(log.timestamp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3 px-2 mb-6 text-slate-400 uppercase tracking-widest font-black text-xs"><History size={16} /> 계정 삭제 기록 및 휴지통</div>
            {deletedMembers.length > 0 ? (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5 w-[30%]">삭제된 부원</th>
                      <th className="px-8 py-5 w-[20%]">학번</th>
                      <th className="px-8 py-5 w-[25%] text-right pr-8">삭제 일시</th>
                      <th className="px-8 py-5 text-center w-[25%]">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {deletedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6 font-bold text-slate-400 line-through">{member.name}</td>
                        <td className="px-8 py-6 text-slate-300 font-medium">{member.studentId}</td>
                        <td className="px-8 py-6 text-right pr-8 text-slate-300 font-medium">{formatTimestamp(member.deletedAt || "")}</td>
                        <td className="px-8 py-6 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => restoreMember(member)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><RotateCcw size={14} /> 복구</button>
                            <button onClick={() => initiateDelete(member, true)} className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[11px] hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} /> 영구 삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-40 bg-white rounded-[3rem] border border-dashed border-slate-200"><p className="text-slate-300 font-black uppercase tracking-widest">삭제된 부원 기록이 없습니다.</p></div>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isDeleteModalOpen && memberToDelete && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeDeleteModal} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl text-center">
              <div className={`w-20 h-20 ${isHardDelete ? "bg-red-600 text-white" : "bg-red-50 text-red-500"} rounded-3xl flex items-center justify-center mx-auto mb-6`}>
                {isHardDelete ? <ShieldBan size={40} /> : <Trash2 size={40} />}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{isHardDelete ? "⚠️ 영구 삭제 승인" : "계정 삭제 승인"}</h2>
              <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
                {isHardDelete ? "이 작업은 되돌릴 수 없습니다. DB에서 영구적으로 삭제됩니다." : `현재 ${memberToDelete.name} 부원을 삭제 기록으로 이동하시겠습니까?`}
              </p>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="관리자 비밀번호" className="w-full px-6 py-5 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-red-500 font-bold mb-6 text-center" />
              <div className="flex gap-4">
                <Button onClick={closeDeleteModal} variant="ghost" className="flex-1 h-16 rounded-2xl font-black text-slate-400">취소</Button>
                <Button onClick={confirmDelete} className={`flex-1 h-16 ${isHardDelete ? "bg-red-600" : "bg-red-50"} text-white rounded-2xl font-black shadow-xl`}>확정</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
