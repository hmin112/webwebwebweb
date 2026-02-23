import { motion } from "framer-motion";
import { PartyPopper, Sparkles, LogIn } from "lucide-react";
import { Button } from "../../components/ui/button";

export const SignupSuccess = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f8faff] to-white px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* 폭죽 아이콘 애니메이션 영역 */}
        <div className="relative inline-block mb-10">
          <motion.div
            initial={{ rotate: -20, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200 relative z-10"
          >
            <PartyPopper size={48} />
          </motion.div>
          
          {/* 장식용 반짝이 애니메이션 */}
          <motion.div 
            animate={{ y: [0, -15, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-6 -right-6 text-pink-500"
          >
            <Sparkles size={32} />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 15, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
            className="absolute -bottom-4 -left-8 text-indigo-400"
          >
            <Sparkles size={24} />
          </motion.div>
        </div>

        {/* 메인 축하 문구 */}
        <div className="space-y-4 mb-12">
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight">
            <span className="text-indigo-600">DEVSIGN</span> 가입을<br />
            축하합니다!
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            이제 DEVSIGN의 정식 부원이 되셨습니다.<br />
            함께 코딩하고 소통하며 멋진 성장을 시작해보아요! 🚀
          </p>
        </div>

        {/* 로그인 페이지 이동 버튼 */}
        <Button 
          onClick={() => onNavigate("login")}
          className="w-full py-8 rounded-[2rem] bg-indigo-600 text-white font-bold text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          로그인하러 가기 <LogIn size={24} />
        </Button>

      </motion.div>
    </div>
  );
};