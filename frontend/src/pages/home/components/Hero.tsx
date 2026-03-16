import { api } from "../../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, Code2, Sparkles, Users2, Pencil, Check, Link as LinkIcon,
  Cpu, Database, Globe, Terminal, Boxes, 
  Layers, Monitor, Smartphone, Zap, Braces
} from "lucide-react"; 
import { Button } from "../../../components/ui/button";
 // ✨ axios 추가

export const Hero = ({ isAdmin }: { isAdmin: boolean }) => {
  // 💡 기존 모집 문구 및 링크 상태 (로컬 스토리지 연동)
  const [recruitmentText, setRecruitmentText] = useState(() => localStorage.getItem("heroRecruitmentText") || "2026년 신입 부원 모집 중");
  const [applyLink, setApplyLink] = useState(() => localStorage.getItem("heroApplyLink") || "https://open.kakao.com/o/example");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);

  // ✨ 1. 초기 데이터 로드 (백엔드 연동)
  useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        const response = await api.get("/admin/settings");
        if (response.data) {
          setRecruitmentText(response.data.recruitmentText);
          setApplyLink(response.data.applyLink);
        }
      } catch (error) {
        console.error("Hero 설정을 불러오는 데 실패했습니다.", error);
      }
    };
    fetchHeroSettings();
  }, []);

  // ✨ 2. 데이터 저장 로직 (백엔드 전송)
  const saveSettings = async (text: string, link: string) => {
    // 로컬 스토리지 동기화
    localStorage.setItem("heroRecruitmentText", text);
    localStorage.setItem("heroApplyLink", link);

    if (isAdmin) {
      try {
        await api.post("/admin/settings", {
          recruitmentText: text,
          applyLink: link
        });
        console.log("백엔드 저장 완료");
      } catch (error) {
        console.error("백엔드 저장 실패", error);
      }
    }
  };

  // 💡 배경 플로팅 아이콘 (원본 보존)
  const floatingIcons = [
    { icon: <Code2 size={48} />, top: "12%", left: "8%", delay: 0 },
    { icon: <Cpu size={64} />, top: "55%", left: "88%", delay: 2 },
    { icon: <Database size={40} />, top: "75%", left: "15%", delay: 4 },
    { icon: <Globe size={56} />, top: "22%", left: "80%", delay: 1 },
    { icon: <Terminal size={32} />, top: "8%", left: "45%", delay: 3 },
    { icon: <Boxes size={48} />, top: "68%", left: "4%", delay: 5 },
    { icon: <Sparkles size={32} />, top: "35%", left: "92%", delay: 1.5 },
    { icon: <Layers size={42} />, top: "85%", left: "40%", delay: 2.5 },
    { icon: <Zap size={36} />, top: "45%", left: "12%", delay: 0.5 },
    { icon: <Braces size={52} />, top: "18%", left: "25%", delay: 4.5 },
    { icon: <Monitor size={44} />, top: "78%", left: "70%", delay: 3.5 },
    { icon: <Smartphone size={38} />, top: "40%", left: "78%", delay: 2.2 },
  ];

  const handleApply = () => {
    if (isEditingLink) return;
    window.open(applyLink, "_blank");
  };

  // 문구 수정 완료 핸들러
  const handleTextSubmit = () => {
    setIsEditing(false);
    saveSettings(recruitmentText, applyLink);
  };

  // 링크 수정 완료 핸들러
  const handleLinkSubmit = () => {
    setIsEditingLink(false);
    saveSettings(recruitmentText, applyLink);
  };

  return (
    <section id="home" className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-gradient-to-b from-[#f8faff] to-white">
      
      {/* 배경 플로팅 아이콘 레이어 (원본 보존) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map((item, index) => (
          <motion.div
            key={index}
            className="absolute text-indigo-300/50"
            style={{ top: item.top, left: item.left }}
            animate={{
              y: [0, -40, 0], 
              x: [0, 20, 0], 
              rotate: [0, 15, 0], 
              opacity: [0.4, 0.7, 0.4] 
            }}
            transition={{
              duration: 10 + index,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ✨ 상단 모집 문구 영역: 모바일에서 더 작게(px-3 py-1.5), 폰트 작게(text-xs) */}
        <div className="flex justify-center mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2 rounded-full bg-white border border-indigo-100 shadow-sm shadow-indigo-100/30"
          >
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse" />
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" value={recruitmentText}
                  onChange={(e) => setRecruitmentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  className="text-xs md:text-sm font-bold text-indigo-600 outline-none border-b border-indigo-200 bg-transparent w-auto"
                  autoFocus
                />
                <button onClick={handleTextSubmit} className="text-green-500 hover:text-green-600">
                  <Check className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-indigo-600">{recruitmentText}</span>
                {isAdmin && (
                  <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                    <Pencil className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* ✨ 타이틀 및 서브 타이틀: 모바일에서 정확히 2줄 개행 및 폰트 크기 조절 */}
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-4xl md:text-[72px] font-[900] tracking-wide text-slate-900 leading-[1.3] md:leading-[1.15]"
          >
            <span className="text-indigo-600 font-[900]">누구나 시작</span>하고,<br />
            <span className="text-pink-500 font-[900]">모두가 성장</span>하는 동아리
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 md:mt-10 text-[13px] md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium px-4 md:px-0"
          >
            실력보다는 열정을, 혼자보다는 함께의 가치를 믿습니다.<br /> 
            DEVSIGN에서 함께 발전해보아요.
          </motion.p>
        </div>

        {/* 💡 ✨ 버튼 및 링크 편집 영역: 모바일에서 버튼 크기(px-6 py-4), 연필 아이콘 축소 */}
        <div className="flex flex-col items-center gap-4 md:gap-6 mb-16 md:mb-28">
          <div className="flex items-center gap-3 md:gap-4">
            <Button 
              onClick={handleApply}
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 md:px-10 md:py-7 rounded-xl md:rounded-2xl font-extrabold text-sm md:text-lg group shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
            >
              지원하기 <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {isAdmin && (
              <button 
                onClick={() => {
                    if (isEditingLink) handleLinkSubmit();
                    else setIsEditingLink(true);
                }}
                className={`p-3 md:p-4 rounded-xl border transition-all ${isEditingLink ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-300 border-slate-100 hover:text-indigo-600 shadow-sm"}`}
              >
                {isEditingLink ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Pencil className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            )}
          </div>

          <AnimatePresence>
            {isEditingLink && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-[280px] md:max-w-md bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-100/20 flex items-center gap-2 md:gap-3"
              >
                <LinkIcon className="text-indigo-500 w-4 h-4 md:w-5 md:h-5" />
                <input 
                  type="text" 
                  value={applyLink}
                  onChange={(e) => setApplyLink(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                  placeholder="카카오톡 오픈채팅 링크 입력"
                  className="flex-1 text-xs md:text-sm font-bold text-slate-600 outline-none placeholder:text-slate-300"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ✨ 하단 카드 영역: 모바일에서 카드가 차지하는 세로 공간 대폭 축소 (gap-4) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          <FeatureCard 
            icon={<Code2 className="text-indigo-500 w-6 h-6 md:w-[30px] md:h-[30px]" />}
            title="개발 (Development)"
            desc="기초 문법부터 구조를 파악하여 다양한 언어들에 익숙해질 수 있게 C언어 교육을 제공합니다."
            color="bg-indigo-50"
          />
          <FeatureCard 
            icon={<Sparkles className="text-purple-500 w-6 h-6 md:w-[30px] md:h-[30px]" />}
            title="다양한 활동"
            desc="회식, 야유회, 공모전 등 다양한 활동을 할 수 있습니다."
            color="bg-purple-50"
          />
          <FeatureCard 
            icon={<Users2 className="text-pink-500 w-6 h-6 md:w-[30px] md:h-[30px]" />}
            title="함께의 가치"
            desc="서로의 지식을 나누는 총회를 통해 어제보다 더 나은 우리를 만들어 갑니다."
            color="bg-pink-50"
          />
        </div>
      </div>
    </section>
  );
};

// ✨ 카드 컴포넌트 수정: 모바일에서는 아이콘이 왼쪽(flex-row), 데스크탑은 위쪽(md:block)
const FeatureCard = ({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) => (
  <motion.div 
    whileHover={{ y: -12 }}
    className="p-5 md:p-10 rounded-[24px] md:rounded-[40px] bg-white border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group flex items-center md:block text-left"
  >
    {/* 모바일: 우측 여백(mr-4) 및 크기 축소 / 데스크탑: 하단 여백(md:mb-8) 및 원래 크기 */}
    <div className={`shrink-0 w-12 h-12 md:w-16 md:h-16 ${color} rounded-xl md:rounded-2xl flex items-center justify-center mr-4 mb-0 md:mr-0 md:mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
      {icon}
    </div>
    
    <div>
      <h3 className="text-[15px] sm:text-lg md:text-2xl font-bold text-slate-900 mb-1 md:mb-4 tracking-tight">
        {title}
      </h3>
      <p className="text-[11px] md:text-base text-slate-500 leading-snug md:leading-relaxed font-medium">
        {desc}
      </p>
    </div>
  </motion.div>
);