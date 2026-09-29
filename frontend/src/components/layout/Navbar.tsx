import { api } from "../../api/axios";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogOut, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation, useNavigate } from "react-router-dom"; // ✨ 라우터 훅 추가

// ✨ [수정] 서버 아이콘을 하드코딩하면 디스코드에서 아이콘을 바꿀 때마다 깨지므로,
// 최초 렌더링 시의 임시값으로만 쓰고 실제로는 /api/guild/icon에서 실시간으로 받아온다.
const FALLBACK_DISCORD_SERVER_ICON = "https://cdn.discordapp.com/icons/462157565229268993/70266f261f01165295208967e73f0555.webp?size=160&quality=lossless";

// 전체 메뉴 데이터
const navLinks = [
  { name: "홈", id: "home" },
  { name: "명예의 전당", id: "halloffame" }, // ✨ [신규] 대회 수상 기록 — 홈 바로 옆
  { name: "주요행사", id: "event" },
  { name: "공지사항", id: "notice" },
  { name: "게시판", id: "board" },
  { name: "동아리소개", id: "about" },
  { name: "자주 묻는 질문", id: "faq" },
  { name: "총회", id: "assembly" },
  { name: "OJ", id: "oj" }, // ✨ [신규] 온라인저지 — 총회 오른쪽, 로그인 시에만 노출
  { name: "관리", id: "admin" }, // ✨ 관리자 전용 메뉴 추가
];

interface NavbarProps {
  onNavigate: (page: string, id?: number) => void;
  currentPage: string;
  isLoggedIn: boolean;
  userRole: string; // ✨ 관리자 권한 확인을 위해 추가
  onLogout: () => void;
  user?: any;
}

export const Navbar = ({ 
  onNavigate, 
  currentPage, 
  isLoggedIn, 
  userRole, 
  onLogout,
  user,
}: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(currentPage); // ✨ 현재 활성화된 밑줄 상태
  const [guildIconUrl, setGuildIconUrl] = useState<string>(FALLBACK_DISCORD_SERVER_ICON);

  const location = useLocation(); // ✨ 현재 경로 확인용
  const navigate = useNavigate(); // ✨ 페이지 이동용

  // ✨ [신규] 디스코드 서버 아이콘을 실시간으로 조회 (아이콘이 바뀌어도 항상 최신 상태 유지)
  useEffect(() => {
    const fetchGuildIcon = async () => {
      try {
        const res = await api.get("/guild/icon");
        if (res.data?.iconUrl) {
          setGuildIconUrl(res.data.iconUrl);
        }
      } catch (e) {
        // 조회 실패 시 기존 값(폴백)을 그대로 사용
      }
    };
    fetchGuildIcon();
  }, []);

  // ✨ [2026-09-08 수정] 예전에는 여기서 탭 아이콘(favicon)을 디스코드 CDN 주소로 덮어썼는데,
  // 그 주소는 (1) 서버 아이콘을 바꾸면 해시가 달라져 예전 주소가 404가 되고 (2) 조회 전 초기값이
  // 만료된 폴백 주소여서, 구글이 페이지를 렌더링해 파비콘을 가져갈 때 깨진 주소를 보고 검색 결과에
  // 로고를 못 띄우는 원인이 됐다. 탭/검색 로고는 index.html의 고정 파일(/favicon.ico)로 고정하고,
  // 화면에 보이는 네비바 로고만 실시간 서버 아이콘을 쓴다.

  // 드로어가 열린 동안 배경 스크롤을 막고 Escape로 닫힌다.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMobileMenuOpen]);

  // ✨ [2026-09-29] 메뉴를 눌러 부드럽게 스크롤되는 동안에는 스크롤 감지가 선택 표시를 바꾸지 못하게 잠근다.
  // (안 그러면 지나가는 중간 섹션마다 선택 표시가 왔다 갔다 해서 버벅여 보였음) 스크롤이 멈추면 잠금 해제.
  const scrollLockRef = useRef(false);
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✨ 스크롤 위치를 감지하여 선택 표시(activeTab)를 자동으로 변경 (ScrollSpy)
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
        { id: "halloffame", navId: "halloffame" },
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

    // 스크롤 이벤트마다 계산하지 않고 프레임당 한 번만 (requestAnimationFrame)
    let frame = 0;
    const onScroll = () => {
      if (scrollLockRef.current) {
        // 프로그램 스크롤 중 — 멈춘 뒤 150ms가 지나면 잠금을 풀고 현재 위치로 한 번 맞춘다
        if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = setTimeout(() => {
          scrollLockRef.current = false;
          handleScroll();
        }, 150);
        return;
      }
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        handleScroll();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll(); // 초기 로드 시 실행

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [location.pathname, currentPage]);

  const handleNavigate = (id: string) => {
    // ✨ 메인 페이지에서 스크롤로 이동할 섹션들
    const scrollSections = ["home", "halloffame", "event", "notice", "board", "about", "faq"];

    if (scrollSections.includes(id)) {
      // Home.tsx의 id="events" 와 맞추기 위한 예외 처리 (event -> events)
      const targetId = id === "event" ? "events" : id;
      
      setActiveTab(id); // 클릭 즉시 선택 표시 이동

      if (location.pathname === "/") {
        // 이미 메인 페이지라면 부드럽게 스크롤 — 스크롤이 끝날 때까지 스크롤 감지 잠금
        const element = document.getElementById(targetId);
        if (element) {
          scrollLockRef.current = true;
          if (scrollIdleTimerRef.current) clearTimeout(scrollIdleTimerRef.current);
          // 이미 그 위치라 스크롤 이벤트가 안 나는 경우를 대비한 안전장치
          scrollIdleTimerRef.current = setTimeout(() => { scrollLockRef.current = false; }, 1200);
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

  // ✨ [2026-09-29] 로그아웃 기록·토큰 폐기는 App.handleLogout이 확인창 이후 한 번에 처리한다
  // (여기서도 기록하면 기록이 두 번 남고, 확인창에서 취소해도 로그아웃 기록이 남았었음)
  const handleLogoutClick = () => {
    onLogout();
    setIsMobileMenuOpen(false);
  };

  const visibleLinks = navLinks.filter(link => {
    if (link.id === "assembly") return isLoggedIn;
    if (link.id === "oj") return isLoggedIn;
    if (link.id === "admin") return isLoggedIn && userRole === "ADMIN";
    return true;
  });

  return (
    <>
      {/* h-16(모바일) / lg:h-20(데스크탑) 으로 반응형 높이 설정 */}
      <nav aria-label="주요 메뉴" className="liquid-glass fixed top-0 left-0 right-0 z-[100] h-16 lg:h-[72px] flex items-center border-x-0 border-t-0 rounded-none">
        <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

          {/* 로고 영역 - 데스크탑에서는 다시 w-10 h-10으로 복구 */}
          <button
            type="button"
            aria-label="DEVSIGN 홈으로 이동"
            className="flex items-center gap-2.5 cursor-pointer shrink-0 rounded-full focus-visible:outline-none"
            onClick={() => handleNavigate("home")}
          >
            <div className="w-9 h-9 rounded-[11px] overflow-hidden shadow-apple-sm border border-black/5 flex items-center justify-center bg-white transition-transform duration-200 hover:scale-105">
              <img
                src={guildIconUrl}
                alt="DEVSIGN"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
                onLoad={(e: any) => {
                  // ✨ 이전에 실패한(예: 만료된 폴백 URL) 요청 때문에 onError가 display:none을 남겨둔
                  // 상태에서, 이후 진짜 아이콘이 성공적으로 로드돼도 계속 숨겨져 있던 버그 수정
                  e.target.style.display = '';
                }}
              />
            </div>
            <span className="font-[800] text-[19px] text-slate-900 tracking-[-0.035em]">
              DEVSIGN
            </span>
          </button>

          {/* 중앙 메뉴 영역 - 데스크탑 폰트 크기 및 패딩 복구 */}
          {/* ✨ [2026-09-29] 리퀴드 글라스 메뉴 — 평평한 메뉴 줄에서 선택된 메뉴만 유리 알약이 아래에서 위로
              톡 떠오른다(누른 버튼이 밑에서 밀려 올라오는 느낌). 이전 알약은 살짝 가라앉으며 사라진다. */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
            {visibleLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <motion.button
                  key={link.id}
                  onClick={() => handleNavigate(link.id)}
                  aria-current={isActive ? "page" : undefined}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`relative px-3 xl:px-4 h-8 xl:h-9 rounded-full font-medium tracking-[-0.01em] text-[12px] xl:text-[14px] whitespace-nowrap transition-colors duration-300 ${
                    isActive ? "text-[#1D1D1F]" : "text-[#1D1D1F]/60 hover:text-[#1D1D1F]"
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.span
                        key="lens"
                        className="absolute inset-0 rounded-full glass-lens"
                        initial={{ opacity: 0, y: 7, scale: 0.82 }}
                        animate={{ opacity: 1, y: -1, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.9, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
                        transition={{ type: "spring", stiffness: 420, damping: 24, mass: 0.8 }}
                      />
                    )}
                  </AnimatePresence>
                  <motion.span
                    className="relative z-[1] inline-block"
                    animate={{ y: isActive ? -1 : 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                  >
                    {link.name}
                  </motion.span>
                </motion.button>
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
                    className="font-semibold text-slate-600 hover:text-slate-900 text-sm"
                    onClick={() => handleNavigate("signup")}
                  >
                    회원가입
                  </Button>
                  <Button 
                    className="apple-button px-6 text-sm"
                    onClick={() => handleNavigate("login")}
                  >
                    로그인
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-1.5 bg-slate-100/70 rounded-full border border-black/[0.035] hover:bg-white hover:shadow-sm transition-all cursor-pointer group"
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
              type="button"
              aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-full bg-slate-100/80 text-slate-700 hover:bg-slate-200 transition-colors"
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
              className="fixed inset-0 bg-slate-950/25 backdrop-blur-sm z-[105] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }} 
              transition={{ type: "spring", damping: 30, stiffness: 300 }} 
              role="dialog"
              aria-modal="true"
              aria-label="모바일 메뉴"
              className="liquid-glass fixed top-2 right-2 bottom-2 w-[86%] max-w-[340px] z-[110] lg:hidden flex flex-col p-5 pt-14 gap-1.5 rounded-[28px] shadow-apple-lg"
            >
              {visibleLinks.map((link) => {
                const isActive = activeTab === link.id;
                return (
                  <button 
                    key={link.id} 
                    onClick={() => handleNavigate(link.id)} 
                    aria-current={isActive ? "page" : undefined}
                    className={`relative text-left py-3 px-4 text-[15px] font-medium tracking-[-0.01em] rounded-2xl transition-colors duration-300 ${
                      isActive ? "glass-lens text-[#1D1D1F] font-semibold" : "text-[#1D1D1F]/65 hover:text-[#1D1D1F] hover:bg-white/50"
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
