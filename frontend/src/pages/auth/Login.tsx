import { api } from "../../api/axios";
import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/button";


// onLoginSuccess의 타입을 boolean에서 any(객체)로 변경하여 상세 데이터를 받을 수 있게 합니다.
export const Login = ({ onNavigate, onLoginSuccess }: { onNavigate: (page: string) => void; onLoginSuccess: (userData: any) => void }) => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 백엔드 로그인 API 호출
      const response = await api.post('/members/login', {
        loginId: userId,
        password: password
      });

      // ✨ 백엔드 응답 데이터 확인 로직
      if (response.data.status === "success") {
        const isAdmin = response.data.role === "ADMIN";

        // JWT 토큰 localStorage에 저장
        if (response.data.token) {
          localStorage.setItem("token", response.data.token);
        }

        // App.tsx의 currentUser 상태에 모든 정보 저장
        onLoginSuccess(response.data);

        if (isAdmin) {
          alert(`${response.data.name} 관리자님, 환영합니다! ✨`);
        } else {
          alert(`${response.data.name}님, 환영합니다!`);
        }
      }
      // ✨ 계정 정지 상태일 경우 (App.tsx의 인터셉터가 로그인 URL은 무시하므로 여기서 직접 알림)
      else if (response.data.status === "suspended") {
        alert(response.data.message); // "정지된 아이디 입니다. 관리자에게 문의하세요."
      }
      else {
        alert("아이디 또는 비밀번호가 틀렸습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      alert("로그인 서버와 통신할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faff] to-white px-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <button onClick={() => onNavigate("home")} className="flex items-center text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors">
          <ArrowLeft size={18} className="mr-2" /> 메인으로 돌아가기
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-slate-100 p-10 md:p-12 relative overflow-hidden">
          {/* 장식용 배경 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-10">
              <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Welcome!</h1>
              <p className="text-slate-500 font-medium">DEVSIGN 서비스 로그인을 진행해주세요.</p>
            </div>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">ID</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="아이디를 입력하세요"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="button" onClick={() => onNavigate("find-account")} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                  계정 정보를 잊으셨나요?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-8 rounded-[2rem] bg-indigo-600 text-white font-black text-xl shadow-2xl shadow-indigo-200/50 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all mt-6"
              >
                {isLoading ? "로그인 중..." : "로그인"} <ArrowRight className="ml-2" />
              </Button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-slate-400 font-bold text-sm">
                아직 회원이 아니신가요?{" "}
                <button onClick={() => onNavigate("signup")} className="text-indigo-600 hover:underline ml-1">회원가입</button>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};