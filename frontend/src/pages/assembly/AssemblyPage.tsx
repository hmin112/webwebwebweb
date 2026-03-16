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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 기존 로직 유지를 위해 남겨둠

  const [selectedLoginId, setSelectedLoginId] = useState<string | null>(null);

  const userMenus = [
    ...(userStatus === "ATTENDING" ? [{ id: "mypage", name: "마이 페이지", icon: <UserCircle size={18} /> }] : []),
    { id: "community", name: "커뮤니티", icon: <Users size={18} /> },
  ];

  const adminMenus = [
    { id: "admin-period", name: "제출 / 자료", icon: <CalendarRange size={18} /> },
  ];

  // 모바일 탭 출력을 위한 통합 메뉴
  const allMenus = [...userMenus, ...(isAdmin ? adminMenus : [])];

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

      {/* 📱 모바일 전용: 알약 모양 상단 탭 (Sticky) */}
      <div className="lg:hidden sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 overflow-x-auto no-scrollbar flex gap-2">
        {allMenus.map((menu) => {
          const isActive = activeTab === menu.id || (menu.id === "community" && activeTab === "member-detail");
          return (
            <button
              key={menu.id}
              onClick={() => handleTabChange(menu.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-xs font-black ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {menu.icon}
              {menu.name}
            </button>
          );
        })}
      </div>

      {/* 💻 데스크탑 사이드바 (기존 유지) */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 sticky top-20 h-[calc(100vh-80px)] p-6 flex flex-col shrink-0">
        <div className="mb-10 px-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <LayoutDashboard size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">총회 시스템</span>
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
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">관리자 메뉴</p>
              {adminMenus.map((menu) => (
                <SidebarLink key={menu.id} active={activeTab === menu.id} onClick={() => handleTabChange(menu.id)} icon={menu.icon} name={menu.name} isAdmin />
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* 🚀 메인 컨텐츠 */}
      {/* ✨ 모바일에서 상단 탭 여유를 위해 패딩 살짝 조정 */}
      <main className="flex-1 p-5 md:p-12 overflow-y-auto">
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