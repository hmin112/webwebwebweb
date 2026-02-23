import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
 // ✨ 로그아웃 로그 기록을 위해 axios 추가

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

export const Navbar = ({ onNavigate, currentPage, isLoggedIn, userRole, onLogout }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ✨ 컴포넌트 마운트 시 및 로그인 상태 변경 시 사용자 정보 로드
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      setUser(null);
    }
  }, [isLoggedIn]);

  const handleNavigate = (id: string) => {
    onNavigate(id);
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
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 h-20 flex items-center shadow-sm">
        <div className="w-full px-8 md:px-12 flex items-center justify-between">

          {/* 로고 영역 */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => handleNavigate("home")}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
              D
            </div>
            <span className="font-bold text-2xl text-slate-900 tracking-tight">DEVSIGN</span>
          </div>

          {/* 중앙 메뉴 영역 */}
          <div className="hidden lg:flex items-center gap-10">
            {visibleLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavigate(link.id)}
                  className={`relative py-2 font-bold transition-all text-[15px] whitespace-nowrap group ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
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

          {/* 우측 버튼 영역 */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-3">
              {!isLoggedIn ? (
                <>
                  <Button variant="ghost" className="font-bold text-slate-600 hover:text-indigo-600" onClick={() => handleNavigate("signup")}>
                    회원가입
                  </Button>
                  <Button className="bg-indigo-600 text-white font-bold px-8 py-5 rounded-xl hover:bg-indigo-700 shadow-lg transition-all active:scale-95" onClick={() => handleNavigate("login")}>
                    로그인
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  {/* ✨ 사람 아이콘 대신 디스코드 프로필 사진으로 교체 */}
                  <div
                    className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all cursor-pointer group"
                    onClick={() => handleNavigate("profile")}
                  >
                    <div className="w-8 h-8 rounded-xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                      {user?.avatarUrl || user?.profileImage ? (
                        <img
                          src={user.avatarUrl || user.profileImage}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; // 로드 실패 시 디스코드 기본 아바타
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold text-xs">
                          {user?.name?.[0] || "U"}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black text-slate-700">{user?.name || "사용자"} 님</span>
                  </div>
                  <Button
                    variant="ghost"
                    className="font-bold text-slate-400 hover:text-red-500 flex items-center gap-2"
                    onClick={handleLogoutClick}
                  >
                    <LogOut size={16} /> 로그아웃
                  </Button>
                </div>
              )}
            </div>
            <button className="lg:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* 모바일 메뉴 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[105] lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[110] lg:hidden flex flex-col p-8 pt-24 gap-6 shadow-2xl">
              {visibleLinks.map((link) => {
                const isActive = currentPage === link.id;
                return (
                  <button key={link.id} onClick={() => handleNavigate(link.id)} className={`text-left py-3 px-4 text-xl font-bold rounded-2xl transition-all ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-700"}`}>
                    {link.name}
                  </button>
                );
              })}
              <div className="mt-auto border-t pt-6 space-y-4">
                {!isLoggedIn ? (
                  <>
                    <Button className="w-full py-6 bg-slate-50 text-slate-600 rounded-2xl font-bold" onClick={() => handleNavigate("signup")}>회원가입</Button>
                    <Button className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-bold" onClick={() => handleNavigate("login")}>로그인</Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div
                      className="px-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer"
                      onClick={() => handleNavigate("profile")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                          <img
                            src={user?.avatarUrl || user?.profileImage || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt="profile"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-bold text-slate-700">{user?.name || "사용자"} 님</span>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </div>
                    <Button className="w-full py-6 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2" onClick={handleLogoutClick}>
                      <LogOut size={18} /> 로그아웃
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