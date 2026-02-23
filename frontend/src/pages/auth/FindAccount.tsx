import { api } from "../../api/axios";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, MessageSquare, ArrowLeft, CheckCircle2, Hash, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";


export const FindAccount = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [activeTab, setActiveTab] = useState<"id" | "pw">("id");
  const [isVerified, setIsVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [foundId, setFoundId] = useState(""); // 찾은 아이디 저장용

  const [formData, setFormData] = useState({ 
    name: "", 
    studentId: "", 
    verificationCode: "",
    newPassword: "",
    confirmPassword: ""
  });

  // ✨ 1. 인증번호 요청 (봇 API 호출)
  const handleRequestDM = async () => {
    if (!formData.name || !formData.studentId) return alert("이름과 학번을 입력해주세요.");
    
    setIsSending(true);
    try {
      // 먼저 이름/학번으로 DB에서 사용자 디스코드 태그를 가져옵니다.
      const res = await api.post("/members/find-discord-by-info", {
        name: formData.name,
        studentId: formData.studentId
      });

      if (res.data.status === "success") {
        const discordTag = res.data.discordTag;
        
        // 봇 서버에 인증번호 발송 요청
        const botRes = await api.post("/members/discord-send", {
          discordTag: discordTag
        });

        if (botRes.data.status === "success") {
          alert(`디스코드(${discordTag}) DM으로 인증번호를 보냈습니다!`);
        }
      } else {
        alert("일치하는 회원 정보가 없습니다.");
      }
    } catch (error) {
      console.error("인증 실패:", error);
      alert("인증번호 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  // ✨ 2. 인증 및 결과 확인 핸들러
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.verificationCode) return alert("인증번호를 입력해주세요.");

    try {
      // 인증번호 검증 (이미 만들어둔 verify-code 활용)
      const res = await api.post("/members/verify-id-pw", {
        name: formData.name,
        studentId: formData.studentId,
        code: formData.verificationCode,
        type: activeTab
      });

      if (res.data.status === "success") {
        if (activeTab === "id") setFoundId(res.data.loginId);
        setIsVerified(true);
      } else {
        alert("인증번호가 틀렸거나 만료되었습니다.");
      }
    } catch (error) {
      alert("인증 확인 중 오류가 발생했습니다.");
    }
  };

  // ✨ 3. 비밀번호 재설정 저장
  const handleResetPassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) return alert("비밀번호가 일치하지 않습니다.");
    if (formData.newPassword.length < 8) return alert("비밀번호는 8자 이상이어야 합니다.");

    try {
      const res = await api.put(`/members/reset-password-final`, {
        name: formData.name,
        studentId: formData.studentId,
        newPassword: formData.newPassword
      });

      if (res.data.status === "success") {
        alert("비밀번호가 성공적으로 변경되었습니다.");
        onNavigate("login");
      }
    } catch (error) {
      alert("비밀번호 변경 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faff] to-white px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <button onClick={() => onNavigate("login")} className="flex items-center text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> 로그인으로 돌아가기
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-slate-100 overflow-hidden">
          <div className="flex bg-slate-50/50 p-2 gap-2">
            <button onClick={() => { setActiveTab("id"); setIsVerified(false); }} className={`flex-1 py-4 rounded-3xl font-bold text-sm transition-all ${activeTab === "id" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>아이디 찾기</button>
            <button onClick={() => { setActiveTab("pw"); setIsVerified(false); }} className={`flex-1 py-4 rounded-3xl font-bold text-sm transition-all ${activeTab === "pw" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>비밀번호 재설정</button>
          </div>

          <div className="p-10">
            {!isVerified ? (
              <form className="space-y-6" onSubmit={handleVerify}>
                <div className="flex items-center gap-3 mb-2">
                   <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <ShieldCheck size={20} />
                   </div>
                   <h2 className="text-2xl font-black text-slate-900">{activeTab === "id" ? "아이디 찾기" : "비밀번호 재설정"}</h2>
                </div>
                <p className="text-slate-500 font-medium mb-8">디스코드 봇 인증을 통해 본인을 확인합니다.</p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">이름</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="홍길동" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">학번 (8자리)</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} placeholder="20261234" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 ml-1 uppercase">디스코드 DM 인증</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" value={formData.verificationCode} onChange={(e) => setFormData({...formData, verificationCode: e.target.value})} placeholder="인증번호 6자리" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none text-center tracking-widest font-bold" />
                      </div>
                      <Button type="button" onClick={handleRequestDM} disabled={isSending} variant="outline" className="h-auto px-6 rounded-2xl font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50">
                        {isSending ? "요청 중..." : "번호 요청"}
                      </Button>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full py-7 rounded-3xl bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-100 mt-4">인증 및 확인</Button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
                {activeTab === "id" ? (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">아이디를 찾았습니다!</h3>
                    <div className="bg-slate-50 p-6 rounded-3xl my-6">
                      <span className="text-3xl font-black text-indigo-600 tracking-tight">{foundId}</span>
                    </div>
                    <Button onClick={() => onNavigate("login")} className="w-full py-6 rounded-3xl bg-slate-900 text-white font-bold">로그인하러 가기</Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">새 비밀번호 설정</h3>
                    <div className="space-y-3 mb-8 text-left">
                      <input type="password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} placeholder="새 비밀번호" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                      <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} placeholder="비밀번호 확인" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                    </div>
                    <Button onClick={handleResetPassword} className="w-full py-6 rounded-3xl bg-indigo-600 text-white font-bold">비밀번호 변경 완료</Button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};