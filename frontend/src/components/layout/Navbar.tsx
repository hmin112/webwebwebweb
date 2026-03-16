import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom"; // ✨ 라우터 훅 추가

// ✨ 여기에 디스코드 서버 아이콘 링크를 넣어주세요!
const DISCORD_SERVER_ICON = "https://cdn.discordapp.com/icons/462157565229268993/70266f261f01165295208967e73f0555.webp?size=160&quality=lossless";

// 전체 메뉴 데이터
const navLinks = [
  { name: "홈", id: "home" },
  { name: "주요행사", id: "event" },
  { name: "공지사항", id: "notice" },
  { name: "게시판", id: "board" },
  { name: "동아리소개", id: "about" },
  { name: "자주 묻는 질문", id: "faq" },
  { name: "총회", id: "assembly" },
  { name: "관리", id: "admin" }, // ✨ 관리자 전용 메뉴 추가
];

interface NavbarProps {
  onNavigate: (page: string, id?: number) => void;
  currentPage: string;
  isLoggedIn: boolean;
  userRole: string; // ✨ 관리자 권한 확인을 위해 추가
  onLogout: () => void;
}

export const Navbar = ({ 
  onNavigate, 
  currentPage, 
  isLoggedIn, 
  userRole, 
  onLogout 
}: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(currentPage); // ✨ 현재 활성화된 밑줄 상태
  
  const location = useLocation(); // ✨ 현재 경로 확인용
  const navigate = useNavigate(); // ✨ 페이지 이동용

  // ✨ 컴포넌트 마운트 시 및 로그인 상태 변경 시 사용자 정보 로드
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }
  }, [isLoggedIn]);

  // ✨ 스크롤 위치를 감지하여 밑줄(activeTab)을 자동으로 변경 (ScrollSpy)
  useEffect(() => {
    // 메인 페이지가 아닐 때는 부모가 주는 currentPage를 그대로 따름
    if (location.pathname !== "/") {
      setActiveTab(currentPage);
      return;
    }

    const handleScroll = () => {
      // 감지할 섹션 리스트 (Home.tsx의 id와 navLinks의 id 매칭)
      const sections = [
        { id: "home", navId: "home" },
        { id: "events", navId: "event" },
        { id: "notice", navId: "notice" },
        { id: "board", navId: "board" },
        { id: "about", navId: "about" },
        { id: "faq", navId: "faq" }
      ];

      let currentSection = "home";
      
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // 섹션이 화면 상단(150px 기준)에 도달했는지 확인
          if (rect.top <= 150) {
            currentSection = section.navId;
          }
        }
      }
      setActiveTab(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 초기 로드 시 실행

    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname, currentPage]);

  const handleNavigate = (id: string) => {
    // ✨ 메인 페이지에서 스크롤로 이동할 섹션들
    const scrollSections = ["home", "event", "notice", "board", "about", "faq"];

    if (scrollSections.includes(id)) {
      // Home.tsx의 id="events" 와 맞추기 위한 예외 처리 (event -> events)
      const targetId = id === "event" ? "events" : id;
      
      setActiveTab(id); // 클릭 즉시 밑줄 이동

      if (location.pathname === "/") {
        // 이미 메인 페이지라면 부드럽게 스크롤
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        // 다른 페이지라면 메인 페이지로 이동하면서 해시(#) 추가
        navigate(`/#${targetId}`);
      }
    } else {
      // ✨ 총회, 관리, 로그인 등 "새 페이지"로 이동할 때는 스크롤을 최상단으로 리셋
      onNavigate(id);
      window.scrollTo(0, 0); 
    }
    
    setIsMobileMenuOpen(false);
  };

  // ✨ 로그아웃 클릭 시 로그를 먼저 남기고 부모의 onLogout 실행
  const handleLogoutClick = async () => {
    const currentUserInfo = JSON.parse(localStorage.getItem("currentUser") || "{}");

    if (currentUserInfo && currentUserInfo.name) {
      try {
        await api.post("/members/logout-log", {
          name: currentUserInfo.name,
          studentId: currentUserInfo.studentId
        });
      } catch (e) {
        console.error("로그아웃 로그 기록 실패", e);
      }
    }

    onLogout();
    setIsMobileMenuOpen(false);
  };

  const visibleLinks = navLinks.filter(link => {
    if (link.id === "assembly") return isLoggedIn;
    if (link.id === "admin") return isLoggedIn && userRole === "ADMIN";
    return true;
  });

  return (
    <>
      {/* h-16(모바일) / lg:h-20(데스크탑) 으로 반응형 높이 설정 */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 h-16 lg:h-20 flex items-center shadow-sm">
        <div className="w-full px-8 md:px-12 flex items-center justify-between">

          {/* 로고 영역 - 데스크탑에서는 다시 w-10 h-10으로 복구 */}
          <div 
            className="flex items-center gap-3 cursor-pointer shrink-0" 
            onClick={() => handleNavigate("home")}
          >
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl overflow-hidden shadow-lg border border-slate-100 flex items-center justify-center bg-white group hover:scale-105 transition-transform">
              <img 
                src={DISCORD_SERVER_ICON} 
                alt="DEVSIGN" 
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.style.display = 'none'; 
                }}
              />
            </div>
            <span className="font-bold text-xl lg:text-2xl text-slate-900 tracking-tight">
              DEVSIGN
            </span>
          </div>

          {/* 중앙 메뉴 영역 - 데스크탑 폰트 크기 및 패딩 복구 */}
          <div className="hidden lg:flex items-center gap-10">
            {visibleLinks.map((link) => {
              const isActive = activeTab === link.id; 
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavigate(link.id)}
                  className={`relative py-1 lg:py-2 font-bold transition-all text-[14px] lg:text-[15px] whitespace-nowrap group ${
                    isActive ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="activeUnderline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {!isActive && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-indigo-600/20 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 우측 버튼 영역 - 데스크탑 크기 복구 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3">
              {!isLoggedIn ? (
                <>
                  <Button 
                    variant="ghost" 
                    className="font-bold text-slate-600 hover:text-indigo-600 text-sm lg:text-base" 
                    onClick={() => handleNavigate("signup")}
                  >
                    회원가입
                  </Button>
                  <Button 
                    className="bg-indigo-600 text-white font-bold px-6 py-4 lg:px-8 lg:py-5 rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95 text-sm lg:text-base" 
                    onClick={() => handleNavigate("login")}
                  >
                    로그인
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer group"
                    onClick={() => handleNavigate("profile")}
                  >
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                      {user?.avatarUrl || user?.profileImage ? (
                        <img
                          src={user.avatarUrl || user.profileImage}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs">
                          {user?.name?.[0] || "U"}
                        </div>
                      )}
                    </div>
                    <span className="text-xs lg:text-sm font-black text-slate-700">
                      {user?.name || "사용자"} 님
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="font-bold text-slate-400 hover:text-red-500 flex items-center gap-2 text-xs lg:text-sm"
                    onClick={handleLogoutClick}
                  >
                    <LogOut size={14} className="lg:w-4 lg:h-4" /> 로그아웃
                  </Button>
                </div>
              )}
            </div>
            
            {/* 모바일 메뉴 햄버거 버튼 */}
            <button 
              className="lg:hidden p-2 text-slate-600" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[105] lg:hidden" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              className="fixed top-0 right-0 bottom-0 w-[75%] max-w-[280px] bg-white z-[110] lg:hidden flex flex-col p-6 pt-16 gap-2 shadow-2xl"
            >
              {visibleLinks.map((link) => {
                const isActive = activeTab === link.id;
                return (
                  <button 
                    key={link.id} 
                    onClick={() => handleNavigate(link.id)} 
                    className={`text-left py-2.5 px-4 text-[15px] font-bold rounded-xl transition-all ${
                      isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-700"
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
              
              <div className="mt-auto border-t pt-4 space-y-2.5">
                {!isLoggedIn ? (
                  <>
                    <Button 
                      className="w-full py-4 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm" 
                      onClick={() => handleNavigate("signup")}
                    >
                      회원가입
                    </Button>
                    <Button 
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm" 
                      onClick={() => handleNavigate("login")}
                    >
                      로그인
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2.5">
                    <div
                      className="px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group cursor-pointer"
                      onClick={() => handleNavigate("profile")}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-white shadow-sm">
                          <img
                            src={user?.avatarUrl || user?.profileImage || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt="profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-slate-700 text-[13px]">
                          {user?.name || "사용자"} 님
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                    <Button 
                      className="w-full py-3.5 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 text-sm" 
                      onClick={handleLogoutClick}
                    >
                      <LogOut size={16} /> 로그아웃
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};