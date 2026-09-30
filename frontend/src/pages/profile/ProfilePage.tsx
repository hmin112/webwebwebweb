import { api } from "../../api/axios";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, MessageSquare, Lock, ChevronLeft, ChevronRight, ShieldCheck, Key, Loader2 } from "lucide-react";
import { TermSelect } from "../assembly/assemblyUi";
import { ActivityStats, type MemberActivity } from "./activity/ActivityWidgets";

const DEPARTMENTS = [
  "AI소프트웨어학부(컴퓨터공학전공)",
  "전자공학과",
  "AI소프트웨어학부(정보통신전공)",
  "AI소프트웨어학부(인공지능공학전공)",
  "AI소프트웨어학부(모빌리티SW전공)"
];

export const ProfilePage = ({ onNavigate, user, setUser, posts = [] }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPwModalOpen, setIsPwModalOpen] = useState(false); 
  
  // ✨ 디스코드 인증을 위한 추가 상태값
  const [authCode, setAuthCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  
  const userPostsCount = useMemo(() => {
    if (!user || !posts) return 0;
    return posts.filter((p: any) => p.loginId === user.loginId).length;
  }, [posts, user]);

  const [userInfo, setUserInfo] = useState({
    name: user?.name || "사용자",
    role: user?.role === "ADMIN" ? "관리자" : "일반 회원",
    userStatus: user?.userStatus || "상태 정보 없음",
    major: user?.dept || "AI소프트웨어학부(컴퓨터공학전공)",
    studentId: user?.studentId || "",
    discord: user?.discordTag || "디스코드 미연동",
    avatar: user?.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png",
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user) {
      setUserInfo({
        name: user.name || "사용자",
        role: user.role === "ADMIN" ? "관리자" : "일반 회원",
        userStatus: user.userStatus || "상태 정보 없음",
        major: user.dept || "AI소프트웨어학부(컴퓨터공학전공)",
        studentId: user.studentId || "",
        discord: user.discordTag || "디스코드 미연동",
        avatar: user.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png",
      });
    }
  }, [user]);

  // ✨ 디스코드 변경 취소 처리 (초기화)
  const handleCancel = () => {
    setIsEditing(false);
    setAuthCode("");
    setIsCodeSent(false);
    setUserInfo({
      ...userInfo,
      major: user?.dept || "AI소프트웨어학부(컴퓨터공학전공)",
      discord: user?.discordTag || "디스코드 미연동"
    });
  };

  // ✨ 디스코드 봇으로 인증번호 전송 요청
  const handleSendDiscordCode = async () => {
    if (!userInfo.discord || userInfo.discord.trim() === "") {
      return alert("변경할 디스코드 태그를 입력해주세요.");
    }
    
    try {
      const response = await api.post("/members/discord-send", { discordTag: userInfo.discord });
      if (response.data.status === "success") {
        alert("인증번호가 새로운 디스코드 계정 DM으로 전송되었습니다! 📩");
        setIsCodeSent(true);
      } else {
        alert(response.data.message || "해당 디스코드 사용자를 찾을 수 없거나 메시지를 보낼 수 없습니다. 태그가 올바른지 확인해주세요.");
      }
    } catch (error) {
      console.error("인증번호 전송 실패:", error);
      alert("서버 오류로 인해 인증번호를 전송할 수 없습니다.");
    }
  };

  const handleSave = async () => {
    // 디스코드 태그가 기존과 다른지 체크
    const originalDiscord = user?.discordTag || "디스코드 미연동";
    const isDiscordChanged = userInfo.discord !== originalDiscord;

    // 태그가 바뀌었는데 인증번호를 입력하지 않았다면 차단!
    if (isDiscordChanged) {
      if (!authCode || authCode.length !== 6) {
        alert("디스코드 계정이 변경되었습니다. '인증번호 받기'를 눌러 DM으로 받은 6자리 코드를 입력해주세요. ⚠️");
        return;
      }
    }

    try {
      // ✨ 변경된 파라미터(authCode)를 백엔드 쿼리로 안전하게 넘겨줍니다
      const response = await api.put(`/members/update/${user.loginId}`, {
        dept: userInfo.major,
        discordTag: userInfo.discord
      }, {
        params: isDiscordChanged ? { authCode: authCode.trim() } : {}
      });

      if (response.data.status === "success") {
        const updatedUser = { 
          ...user, 
          dept: userInfo.major, 
          discordTag: userInfo.discord 
        };
        
        if (setUser) setUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));

        alert("모든 정보가 안전하게 저장되었습니다! ✅");
        setIsEditing(false);
        setAuthCode("");
        setIsCodeSent(false);
      } else {
        alert(response.data.message || "저장에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("저장 실패:", error);
      // 서버에서 보낸 에러 메시지(예: 잘못된 인증번호)가 있다면 그대로 표출
      if (error.response && error.response.data && error.response.data.message) {
        alert(error.response.data.message);
      } else {
        alert("서버 저장 중 오류가 발생했습니다.");
      }
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    try {
      const response = await api.put(`/members/change-password/${user.loginId}`, {
        currentPassword,
        newPassword
      });

      if (response.data.status === "success") {
        alert("비밀번호가 성공적으로 변경되었습니다. 🔐");
        setIsPwModalOpen(false);
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        alert(response.data.message || "현재 비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      console.error("비밀번호 변경 실패:", error);
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  // ✨ [2026-09-30] 이번 학기 내 활동(출석·총회·OJ·회비) — 학기를 바꿔 지난 학기도 볼 수 있다
  const termOptions = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const curYear = m === 1 ? now.getFullYear() - 1 : now.getFullYear();
    const curSem = m >= 2 && m <= 7 ? 1 : 2;
    const opts: { year: number; semester: number }[] = [];
    let y = 2026, sm = 1;
    while (y < curYear || (y === curYear && sm <= curSem)) {
      opts.push({ year: y, semester: sm });
      sm++;
      if (sm > 2) { sm = 1; y++; }
    }
    return opts.reverse();
  }, []);
  const [term, setTerm] = useState(termOptions[0]);
  const [activity, setActivity] = useState<MemberActivity | null>(null);
  const [activityState, setActivityState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!user?.loginId) return;
    let cancelled = false;
    setActivityState("loading");
    api.get("/activity/me", { params: { year: term.year, semester: term.semester } })
      .then((res) => { if (!cancelled) { setActivity(res.data); setActivityState("ready"); } })
      .catch(() => { if (!cancelled) setActivityState("error"); });
    return () => { cancelled = true; };
  }, [user?.loginId, term]);



  return (
    <div className="relative min-h-screen pt-24 md:pt-28 pb-20">
      {/* ✨ [2026-09-30] 리퀴드 글라스 배경 — 유리 카드 뒤로 은은한 색이 비치도록 옅게 번진 색 덩어리 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(10 132 255 / 0.22), transparent 65%)" }} />
        <div className="absolute top-1/3 -right-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(191 90 242 / 0.18), transparent 65%)" }} />
        <div className="absolute -bottom-40 left-1/4 w-[520px] h-[520px] rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, rgb(100 210 255 / 0.2), transparent 65%)" }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-0.5 text-[15px] text-[#0071E3] hover:opacity-70 transition-opacity mb-3"
        >
          <ChevronLeft size={18} /> 홈
        </button>
        <h1 className="text-[34px] md:text-[40px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight mb-6 md:mb-8">프로필</h1>

        {/* 프로필 카드 — 왼쪽: 사진·이름·학번, 오른쪽: 이번 학기 활동(출석·총회 제출·회비) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card rounded-[32px] p-6 md:p-8 mb-10 md:mb-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 md:gap-6 min-w-0 lg:pr-8">
            <img
              src={userInfo.avatar}
              alt="프로필 사진"
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover ring-4 ring-white shadow-[0_8px_24px_rgb(0_0_0/0.12)] shrink-0"
              onError={(e: any) => (e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png")}
            />
            <div className="min-w-0">
              <h2 className="text-[28px] md:text-[32px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight truncate">{userInfo.name}</h2>
              <p className="text-[15px] text-[#6E6E73] mt-1">
                {userInfo.studentId ? `${userInfo.studentId}학번` : "학번 없음"} · {userInfo.userStatus}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {user?.role === "ADMIN" && (
                  <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-xs font-semibold">
                    <ShieldCheck size={13} /> 관리자
                  </span>
                )}
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-black/[0.05] text-[#3A3A3C] text-xs font-semibold">
                  <MessageSquare size={12} /> 작성글 {userPostsCount}개
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 lg:pt-0 lg:pl-8 border-t lg:border-t-0 lg:border-l border-black/[0.06] lg:min-w-[400px]">
            <div className="flex items-center justify-between gap-3 mb-5">
              <p className="text-[13px] font-semibold text-[#6E6E73]">이번 학기 활동</p>
              <TermSelect value={term} options={termOptions} onChange={setTerm} />
            </div>
            {activityState === "loading" && !activity ? (
              <div className="h-[170px] flex items-center justify-center gap-2 text-[#8E8E93] text-sm">
                <Loader2 size={16} className="animate-spin" /> 불러오는 중이에요
              </div>
            ) : activityState === "error" || !activity ? (
              <div className="h-[170px] flex items-center justify-center text-[#8E8E93] text-sm">활동 정보를 불러오지 못했어요.</div>
            ) : (
              <ActivityStats data={activity} />
            )}
          </div>
        </motion.div>

        {/* 계정 — 설정 앱처럼 한 카드 안에 줄 목록 */}
        <div className="flex items-end justify-between gap-3 mb-3 px-1">
          <h2 className="text-[22px] md:text-2xl font-bold text-[#1D1D1F] tracking-[-0.02em]">계정</h2>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="text-[15px] font-semibold text-[#0071E3] hover:opacity-70 transition-opacity">편집</button>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={handleCancel} className="text-[15px] text-[#0071E3] hover:opacity-70 transition-opacity">취소</button>
              <button onClick={handleSave} className="text-[15px] font-semibold text-[#0071E3] hover:opacity-70 transition-opacity">완료</button>
            </div>
          )}
        </div>
        <div className="glass-card rounded-[26px] overflow-hidden divide-y divide-black/[0.06]">
          <SettingsRow icon={<GraduationCap size={16} />} color="#34C759" label="소속 학과">
            {isEditing ? (
              <select
                value={userInfo.major}
                onChange={(e) => setUserInfo({ ...userInfo, major: e.target.value })}
                className="w-full sm:w-auto max-w-full h-9 px-3 rounded-xl text-sm font-medium text-[#1D1D1F] outline-none cursor-pointer"
              >
                {DEPARTMENTS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <span className="text-[15px] text-[#6E6E73] truncate">{userInfo.major}</span>
            )}
          </SettingsRow>
          <SettingsRow icon={<MessageSquare size={16} />} color="#5865F2" label="디스코드">
            {isEditing ? (
              <input
                type="text"
                value={userInfo.discord}
                onChange={(e) => { setUserInfo({ ...userInfo, discord: e.target.value }); setIsCodeSent(false); }}
                className="w-full sm:w-60 h-9 px-3 rounded-xl text-sm font-medium text-[#1D1D1F] outline-none"
              />
            ) : (
              <span className="text-[15px] text-[#6E6E73] truncate">{userInfo.discord}</span>
            )}
          </SettingsRow>

          {/* 디스코드 태그를 바꾸면 새 계정 본인 인증 */}
          <AnimatePresence>
            {isEditing && userInfo.discord !== (user?.discordTag || "디스코드 미연동") && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="px-5 py-4 bg-[#0071E3]/[0.04]">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0071E3] mb-2.5"><ShieldCheck size={14} /> 새 디스코드 계정 본인 인증</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={isCodeSent ? "DM으로 받은 6자리 인증번호" : "먼저 '인증번호 받기'를 눌러주세요"}
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      disabled={!isCodeSent}
                      maxLength={6}
                      className="flex-1 h-10 px-3.5 rounded-xl text-sm font-medium outline-none disabled:opacity-60"
                    />
                    <button onClick={handleSendDiscordCode} type="button" className="h-10 px-5 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors shrink-0">
                      {isCodeSent ? "다시 보내기" : "인증번호 받기"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setIsPwModalOpen(true)} className="w-full text-left hover:bg-black/[0.025] transition-colors">
            <SettingsRow icon={<Key size={16} />} color="#8E8E93" label="비밀번호 변경">
              <ChevronRight size={18} className="text-[#C7C7CC]" />
            </SettingsRow>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isPwModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setIsPwModalOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="glass-card relative w-full max-w-sm rounded-[28px] p-6 md:p-7"
            >
              <div className="flex flex-col items-center text-center mb-5">
                <span className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center mb-3"><Lock size={20} /></span>
                <h3 className="text-xl font-bold text-[#1D1D1F] tracking-[-0.02em]">비밀번호 변경</h3>
                <p className="text-[13px] text-[#8E8E93] mt-1">새 비밀번호는 8자 이상으로 정해 주세요.</p>
              </div>
              <div className="space-y-2.5">
                <input type="password" placeholder="현재 비밀번호" className="w-full h-11 px-4 rounded-xl text-sm outline-none" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
                <input type="password" placeholder="새 비밀번호" className="w-full h-11 px-4 rounded-xl text-sm outline-none" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
                <input type="password" placeholder="새 비밀번호 확인" className="w-full h-11 px-4 rounded-xl text-sm outline-none" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setIsPwModalOpen(false)} className="flex-1 h-11 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">취소</button>
                <button onClick={handleChangePassword} className="flex-1 h-11 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors">변경</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 설정 앱 스타일 한 줄 — 왼쪽 색 아이콘 + 이름, 오른쪽 값
const SettingsRow = ({ icon, color, label, children }: { icon: ReactNode; color: string; label: string; children: ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-5 py-4 min-h-[60px]">
    <div className="flex items-center gap-3 shrink-0">
      <span className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white" style={{ backgroundColor: color }}>{icon}</span>
      <span className="text-[15px] text-[#1D1D1F]">{label}</span>
    </div>
    <div className="min-w-0 flex sm:justify-end">{children}</div>
  </div>
);
