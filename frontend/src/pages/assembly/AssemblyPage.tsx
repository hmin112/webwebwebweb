import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle, Users, LayoutDashboard, ChevronRight,
  Menu as MenuIcon, X, CalendarRange
} from "lucide-react";

// 분리된 탭 컴포넌트 임포트 (Attendance 관련 컴포넌트 제외)
import { MyPageTab } from "../profile/tabs/MyPageTab";
import { CommunityTab } from "../profile/tabs/CommunityTab";
import { AdminPeriodTab } from "../profile/tabs/AdminPeriodTab";
import { MemberDetailTab } from "../profile/tabs/MemberDetailTab";

export const AssemblyPage = ({ isAdmin, userStatus, loginId, onNavigate }: {
  isAdmin: boolean,
  userStatus: string,
  loginId: string,
  onNavigate: (page: string, identifier?: any) => void,
  user?: any
}) => {
  const [activeTab, setActiveTab] = useState(userStatus === "ATTENDING" ? "mypage" : "community");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [selectedLoginId, setSelectedLoginId] = useState<string | null>(null);

  // --- ✨ 출석 시스템 관련 모든 상태 및 useEffect 제거됨 ---

  const userMenus = [
    ...(userStatus === "ATTENDING" ? [{ id: "mypage", name: "마이 페이지", icon: <UserCircle size={20} /> }] : []),
    { id: "community", name: "커뮤니티", icon: <Users size={20} /> },
  ];

  const adminMenus = [
    { id: "admin-period", name: "제출 기간 / 자료 현황", icon: <CalendarRange size={20} /> },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSelectedLoginId(null);
    setIsMobileMenuOpen(false);
  };

  const handleShowMemberDetail = (targetLoginId: string) => {
    setSelectedLoginId(targetLoginId);
    setActiveTab("member-detail");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row pt-20 font-sans selection:bg-indigo-100 selection:text-indigo-700">

      {/* 📱 모바일 상단 */}
      <div className="lg:hidden sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
          <span className="font-black text-slate-900 tracking-tight text-sm uppercase">{activeTab}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600">
          <MenuIcon size={24} />
        </button>
      </div>

      {/* 💻 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 sticky top-20 h-[calc(100vh-80px)] p-6 flex flex-col shrink-0">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <LayoutDashboard size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">System</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">DEVSIGN</h2>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {userMenus.map((menu) => (
            <SidebarLink
              key={menu.id}
              active={activeTab === menu.id || (menu.id === "community" && activeTab === "member-detail")}
              onClick={() => handleTabChange(menu.id)}
              icon={menu.icon}
              name={menu.name}
            />
          ))}
          {isAdmin && (
            <div className="pt-8 mt-8 border-t border-slate-100">
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Admin Menu</p>
              {adminMenus.map((menu) => (
                <SidebarLink key={menu.id} active={activeTab === menu.id} onClick={() => handleTabChange(menu.id)} icon={menu.icon} name={menu.name} isAdmin />
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* 📱 모바일 메뉴 드로워 */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[150] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25 }} className="relative w-[80%] max-w-xs bg-white h-full p-8 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-slate-900">시스템 메뉴</h2>
                <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} className="text-slate-300" /></button>
              </div>
              <nav className="space-y-2">
                {userMenus.map((menu) => (
                  <SidebarLink
                    key={menu.id}
                    active={activeTab === menu.id || (menu.id === "community" && activeTab === "member-detail")}
                    onClick={() => handleTabChange(menu.id)}
                    icon={menu.icon}
                    name={menu.name}
                  />
                ))}
                {isAdmin && (
                  <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                    {adminMenus.map((menu) => (
                      <SidebarLink key={menu.id} active={activeTab === menu.id} onClick={() => handleTabChange(menu.id)} icon={menu.icon} name={menu.name} isAdmin />
                    ))}
                  </div>
                )}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 메인 컨텐츠 */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "mypage" && <MyPageTab key="mypage" loginId={loginId} />}

          {activeTab === "community" && (
            <CommunityTab
              key="community"
              onNavigate={(_page, identifier) => identifier ? handleShowMemberDetail(String(identifier)) : onNavigate(_page)}
            />
          )}

          {activeTab === "member-detail" && selectedLoginId && (
            <MemberDetailTab
              key="member-detail"
              loginId={selectedLoginId}
              onBack={() => setActiveTab("community")}
            />
          )}

          {activeTab === "admin-period" && <AdminPeriodTab key="admin-period" />}
        </AnimatePresence>
      </main>
    </div>
  );
};

const SidebarLink = ({ active, onClick, icon, name, isAdmin }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${active
        ? (isAdmin ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-indigo-50 text-indigo-600")
        : "text-slate-500 hover:bg-slate-50"
      }`}
  >
    <div className="flex items-center gap-3">
      <div className={active ? "text-current" : "text-slate-400 group-hover:text-indigo-600"}>{icon}</div>
      <span className="font-bold text-[15px]">{name}</span>
    </div>
    {active && <ChevronRight size={16} />}
  </button>
);