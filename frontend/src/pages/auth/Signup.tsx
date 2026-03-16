import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Lock, MessageSquare, GraduationCap, 
  Heart, ArrowRight, ArrowLeft, ShieldCheck, Timer, CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";


const DEPARTMENTS = [
  "AI소프트웨어학부(컴퓨터공학전공)",
  "전자공학과",
  "AI소프트웨어학부(정보통신전공)",
  "AI소프트웨어학부(인공지능공학전공)",
  "AI소프트웨어학부(모빌리티SW전공)"
];
const INTERESTS = ["인공지능", "웹 개발", "게임 개발", "임베디드 / 시스템", "기타"];

export const Signup = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [formData, setFormData] = useState({
    userId: "",
    password: "",
    dept: "",
    interest: "",
    otherInterest: "",
    discord: ""
  });

  const [idChecked, setIdChecked] = useState(false);
  const [discordVerified, setDiscordVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);

  // ✨ 디스코드 인증 후 받아올 정보 (이름, 학번 식별자 등)
  const [verifiedInfo, setVerifiedInfo] = useState<{
    name: string;
    studentId: string;
    userStatus: string;
    role: string;
  } | null>(null);

  // 타이머 관련 상태
  const [timeLeft, setTimeLeft] = useState(0); 
  const [isTimerActive, setIsTimerActive] = useState(false);

  // 타이머 로직
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // 정규식 정의
  const idRegex = /^(?=.{6,}$)[\p{L}\p{N}]+$/u;
  const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

  // 아이디 중복 확인
  const handleCheckId = async () => {
    if (!idRegex.test(formData.userId)) {
      return alert("아이디는 문자(한글/영문) 또는 문자+숫자 조합으로 6자 이상이어야 합니다.");
    }
    try {
      const response = await api.get(`/members/check/${formData.userId}`);
      if (response.data === true) {
        alert("이미 사용 중인 아이디입니다. ❌");
        setIdChecked(false);
      } else {
        alert("사용 가능한 아이디입니다! ✅");
        setIdChecked(true);
      }
    } catch (error) {
      alert("서버 통신 오류가 발생했습니다.");
    }
  };

  // 디스코드 인증번호 전송
  const handleSendDiscordCode = async () => {
    if (formData.discord.length < 2 || formData.discord.includes(" ")) {
      return alert("올바른 디스코드 사용자명을 입력해주세요. (공백 제외)");
    }
    setIsSendingCode(true);
    try {
      const discordTag = formData.discord.replace("@", "");
      // ⭕ 올바른 백엔드 주소(/members/discord-send)로 복구
      const response = await api.post("/members/discord-send", {
        discordTag: discordTag
      });
      
      if (response.data.status === "success") {
        setTimeLeft(300);
        setIsTimerActive(true);
        alert(`@${discordTag}님의 디스코드 DM으로 인증번호가 발송되었습니다. 📩`);
      } else if (response.data.status === "bot_error") {
        alert("디스코드 봇 서버에 문제가 발생했습니다. 관리자에게 문의하세요.");
      } else {
        alert("인증번호 발송에 실패했습니다. 동아리 서버에 계정이 있는지 확인해주세요.");
      }
    } catch (e) {
      console.error("인증번호 발송 에러:", e);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  // 인증번호 확인 로직
  const handleVerifyCode = async () => {
    if (timeLeft === 0 && !discordVerified) {
      return alert("인증 시간이 만료되었습니다. 번호를 다시 전송해주세요.");
    }
    if (verificationCode.length !== 6) return alert("인증번호 6자리를 입력해주세요.");
    
    try {
      const discordTag = formData.discord.replace("@", "");

      const response = await api.post("/members/verify-code", {
        discordTag: discordTag,
        code: verificationCode
      });

      if (response.data.status === "success") {
        setVerifiedInfo({
          name: response.data.name,
          studentId: response.data.studentId, 
          userStatus: response.data.userStatus,
          role: response.data.role
        });
        setDiscordVerified(true);
        setIsTimerActive(false);
        alert(`인증 성공! 🎉 [${response.data.studentId}학번 ${response.data.name}]님 확인되었습니다.`);
      } else {
        alert("인증번호가 일치하지 않거나 만료되었습니다. ❌");
      }
    } catch (error) {
      console.error("인증 에러:", error);
      alert("인증 확인 중 서버 오류가 발생했습니다.");
    }
  };

  // 회원가입 최종 요청
  const handleSignup = async () => {
    if (!idChecked) return alert("아이디 중복 확인을 완료해주세요.");
    if (!idRegex.test(formData.userId)) return alert("아이디 형식을 확인해주세요.");
    if (!passwordRegex.test(formData.password)) return alert("비밀번호 형식을 확인해주세요.");
    if (!formData.dept) return alert("학과를 선택해주세요.");
    if (!discordVerified || !verifiedInfo) return alert("디스코드 인증을 완료해주세요.");

    try {
      const response = await api.post("/members/signup", {
        loginId: formData.userId,
        password: formData.password,
        dept: formData.dept,
        interests: formData.interest === "기타" ? formData.otherInterest : formData.interest,
        discordTag: formData.discord.replace("@", ""),
        authCode: verificationCode 
      });

      if (response.status === 200 || response.status === 201) {
        alert("회원가입을 축하합니다! 🎉");
        onNavigate("signup-success");
      }
    } catch (error) {
      alert("회원가입에 실패했습니다. 이미 가입된 계정인지 확인해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faff] to-white px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <button onClick={() => onNavigate("home")} className="flex items-center text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> 메인으로 돌아가기
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-slate-100 p-10 md:p-12">
          <div className="mb-12">
            <h1 className="text-3xl font-black text-slate-900 mb-2">회원가입</h1>
            <p className="text-slate-500 font-medium">개인정보 입력 없이 디스코드 인증만으로 가입하세요! ✨</p>
          </div>

          <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
            <section className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full" /> 계정 설정
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">아이디</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className={`absolute left-5 top-1/2 -translate-y-1/2 ${idChecked ? "text-green-500" : "text-slate-300"}`} size={18} />
                      <input 
                        type="text" 
                        value={formData.userId} 
                        onChange={(e) => setFormData({...formData, userId: e.target.value.replace(/\s/g, "")})} 
                        disabled={idChecked} 
                        placeholder="6자 이상" 
                        className={`w-full pl-12 pr-2 py-4 rounded-2xl outline-none transition-all font-medium text-sm ${idChecked ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-900"}`} 
                      />
                    </div>
                    <Button onClick={handleCheckId} disabled={idChecked} className="h-[56px] px-5 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg">중복 확인</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 uppercase">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="password" placeholder="특수문자 포함 8자 이상" className="w-full pl-14 pr-4 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" onChange={(e) => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-400 rounded-full" /> 디스코드 인증
              </h3>
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-bold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  💡 동아리 디스코드 서버의 별명(예: 22 홍길동)을 통해 이름과 학번 정보를 자동으로 가져옵니다. 별명이 형식에 맞지 않으면 가입이 거절될 수 있습니다.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text" 
                      value={formData.discord} 
                      onChange={(e) => setFormData({...formData, discord: e.target.value})} 
                      disabled={discordVerified} 
                      placeholder="디스코드 사용자명 (username)" 
                      className="w-full pl-14 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-medium" 
                    />
                  </div>
                  <Button onClick={handleSendDiscordCode} disabled={discordVerified || isSendingCode} className="h-[56px] px-5 rounded-2xl font-bold border border-indigo-100 text-indigo-600 bg-white hover:bg-indigo-50">번호 전송</Button>
                </div>
                
                <div className="flex gap-2 items-stretch">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={verificationCode} 
                      onChange={(e) => setVerificationCode(e.target.value)} 
                      disabled={discordVerified} 
                      placeholder="인증번호 6자리" 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none text-center tracking-widest font-bold h-full" 
                    />
                    {isTimerActive && !discordVerified && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                        <Timer size={14} />
                        {formatTime(timeLeft)}
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleVerifyCode} 
                    disabled={discordVerified || (isTimerActive && timeLeft === 0)} 
                    className="h-[56px] px-8 rounded-2xl font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  >
                    인증 확인
                  </Button>
                </div>

                <AnimatePresence>
                  {discordVerified && verifiedInfo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-center justify-between shadow-inner"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Verified Information</p>
                          <p className="text-lg font-black text-slate-900">
                            {verifiedInfo.studentId}학번 {verifiedInfo.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">
                          {verifiedInfo.userStatus}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Auth Role: {verifiedInfo.role}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <section className="space-y-4">
              <label className="text-sm font-black text-slate-700 ml-1 flex items-center gap-2"><GraduationCap size={18} className="text-indigo-600" /> 소속 학과</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPARTMENTS.map((d) => (
                  <button key={d} type="button" onClick={() => setFormData({ ...formData, dept: d })} className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all text-left ${formData.dept === d ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{d}</button>
                ))}
              </div>
            </section>

            <section className="space-y-4 pt-4">
              <label className="text-sm font-black text-slate-700 ml-1 flex items-center gap-2"><Heart size={18} className="text-pink-500" /> 관심 분야</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => setFormData({ ...formData, interest })}
                    className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all ${
                      formData.interest === interest
                        ? "bg-pink-500 text-white shadow-lg shadow-pink-100"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {formData.interest === "기타" && (
                <motion.input
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  type="text"
                  placeholder="관심 분야를 직접 입력해주세요"
                  className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 transition-all font-medium mt-2"
                  onChange={(e) => setFormData({ ...formData, otherInterest: e.target.value })}
                />
              )}
            </section>

            <Button
              onClick={handleSignup}
              disabled={!idChecked || !discordVerified}
              className={`w-full py-8 rounded-[2rem] font-bold text-xl mt-12 transition-all ${(!idChecked || !discordVerified) ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-indigo-600 text-white shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95"}`}
            >
              회원가입 완료 <ArrowRight className="ml-2" />
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};