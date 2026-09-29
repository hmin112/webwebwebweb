import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  UserCircle, Users, LayoutDashboard, ChevronRight, CalendarRange, Layers, CheckSquare, ClipboardCheck, MonitorPlay, BookOpen
} from "lucide-react";

// 분리된 탭 컴포넌트 임포트
import { MyPageTab } from "../profile/tabs/MyPageTab";
import { CommunityTab } from "../profile/tabs/CommunityTab";
import { TeamTab } from "../profile/tabs/TeamTab";
import { AdminPeriodTab } from "../profile/tabs/AdminPeriodTab";
import { MemberDetailTab } from "../profile/tabs/MemberDetailTab";
import { AttendanceMemberTab } from "./tabs/AttendanceMemberTab";
import { AttendanceAdminTab } from "./tabs/AttendanceAdminTab";
import { AssemblyBannerAdminTab } from "./tabs/AssemblyBannerAdminTab";
import { AssemblyPlanPage } from "../profile/tabs/AssemblyPlanPage";
import { TeamPlanPage } from "../profile/tabs/TeamPlanPage";
import { GuideTab } from "./tabs/GuideTab";
import { AdminGuideTab } from "./tabs/AdminGuideTab";

export const AssemblyPage = ({ isAdmin, userStatus, loginId, onNavigate }: {
  isAdmin: boolean,
  userStatus: string,
  loginId: string,
  onNavigate: (page: string, identifier?: any) => void,
  user?: any
}) => {
  const [activeTab, setActiveTab] = useState(userStatus === "ATTENDING" ? "mypage" : "community");
  const [, setIsMobileMenuOpen] = useState(false); // 기존 로직 유지를 위해 남겨둠

  const [selectedLoginId, setSelectedLoginId] = useState<string | null>(null);
  // ✨ 회원 상세를 어느 탭에서 열었는지 기억해뒀다가, 뒤로가기 시 그 탭으로 복귀시키기 위함
  const [memberDetailOrigin, setMemberDetailOrigin] = useState<string>("community");

  // ✨ [2026-09-03 추가] 계획서(3월/9월) 작성 — 사이드바는 그대로 두고 메인 영역만
  // 별도 "페이지"로 전환하는 방식(member-detail과 동일한 패턴)
  const [planEditorReport, setPlanEditorReport] = useState<any | null>(null);
  const handleOpenPlanEditor = (report: any) => {
    setPlanEditorReport(report);
    setActiveTab("plan-editor");
  };

  // ✨ [신규] 팀 공유 자료의 계획서(3월/9월) 작성 — 개인용 plan-editor와 동일한 패턴
  const [teamPlanEditorState, setTeamPlanEditorState] = useState<{ submission: any; team: any } | null>(null);
  const handleOpenTeamPlanEditor = (submission: any, team: any) => {
    setTeamPlanEditorState({ submission, team });
    setActiveTab("team-plan-editor");
  };

  const userMenus = [
    ...(userStatus === "ATTENDING" ? [{ id: "mypage", name: "마이 페이지", icon: <UserCircle size={18} /> }] : []),
    { id: "community", name: "커뮤니티", icon: <Users size={18} /> },
    ...(userStatus === "ATTENDING" ? [{ id: "team", name: "팀 프로젝트", icon: <Layers size={18} /> }] : []),
    // ✨ 출석 대상 여부는 백엔드가 업로드된 엑셀 명단으로 판단하므로 ATTENDING 게이팅 없이 항상 노출
    { id: "attendance", name: "출석", icon: <CheckSquare size={18} /> },
    // ✨ [2026-09-29] 부원용 기능 사용법 (관리자 기능 제외)
    { id: "guide", name: "사용법", icon: <BookOpen size={18} /> },
  ];

  const adminMenus = [
    { id: "admin-period", name: "제출 / 자료", icon: <CalendarRange size={18} /> },
    { id: "admin-attendance", name: "출석 설정", icon: <ClipboardCheck size={18} /> },
    { id: "admin-banner", name: "총회 배너", icon: <MonitorPlay size={18} /> },
    // ✨ [2026-09-30] 관리자 전용 사용법
    { id: "admin-guide", name: "관리자 사용법", icon: <BookOpen size={18} /> },
  ];

  // 모바일 탭 출력을 위한 통합 메뉴
  const allMenus = [...userMenus, ...(isAdmin ? adminMenus : [])];

  // ✨ [2026-09-29] 탭(또는 부원 상세·계획서 페이지)이 바뀌면 맨 위에서 시작 — 이전 탭에서 내려둔
  // 스크롤 위치가 그대로 남아 새 탭이 중간부터 보이던 문제. 창 스크롤과 메인 영역 스크롤을 모두 초기화한다.
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeTab, selectedLoginId]);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setSelectedLoginId(null);
    setPlanEditorReport(null);
    setTeamPlanEditorState(null);
    setIsMobileMenuOpen(false);
  };

  const handleShowMemberDetail = (targetLoginId: string) => {
    setMemberDetailOrigin(activeTab);
    setSelectedLoginId(targetLoginId);
    setActiveTab("member-detail");
  };

  return (
    // ✨ [2026-09-30] 애플 스타일 틀 — 상단 바 높이(64/72px)에 맞춘 여백, 옅은 회색 배경, 내용은 가운데 정렬(max-w-5xl)
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col lg:flex-row pt-16 lg:pt-[72px] font-sans selection:bg-[#0071E3]/15">

      {/* 📱 모바일 전용: 알약 모양 상단 탭 (Sticky) */}
      <div className="lg:hidden sticky top-16 z-40 bg-[#F5F5F7]/85 backdrop-blur-xl border-b border-black/[0.06] px-4 py-2.5 overflow-x-auto no-scrollbar flex gap-1.5">
        {allMenus.map((menu) => {
          const isActive = activeTab === menu.id || (menu.id === memberDetailOrigin && activeTab === "member-detail") || (menu.id === "mypage" && activeTab === "plan-editor") || (menu.id === "team" && activeTab === "team-plan-editor");
          return (
            <button
              key={menu.id}
              onClick={() => handleTabChange(menu.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap transition-colors text-[13px] font-semibold [&_svg]:w-4 [&_svg]:h-4 ${
                isActive
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-[#fff] text-[#1D1D1F]/70 border border-black/[0.06]"
              }`}
            >
              {menu.icon}
              {menu.name}
            </button>
          );
        })}
      </div>

      {/* 💻 데스크탑 사이드바 (기존 유지) */}
      <aside className="hidden lg:flex w-64 bg-[#FBFBFD] border-r border-black/[0.06] sticky top-[72px] h-[calc(100vh-72px)] px-4 py-6 flex-col shrink-0">
        <div className="mb-6 px-3">
          <div className="flex items-center gap-1.5 text-[#8E8E93] mb-1">
            <LayoutDashboard size={14} />
            <span className="text-[11px] font-semibold tracking-wide">총회 시스템</span>
          </div>
          <h2 className="text-xl font-bold text-[#1D1D1F] tracking-[-0.02em]">DEVSIGN</h2>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {userMenus.map((menu) => (
            <SidebarLink
              key={menu.id}
              active={activeTab === menu.id || (menu.id === memberDetailOrigin && activeTab === "member-detail") || (menu.id === "mypage" && activeTab === "plan-editor") || (menu.id === "team" && activeTab === "team-plan-editor")}
              onClick={() => handleTabChange(menu.id)}
              icon={menu.icon}
              name={menu.name}
            />
          ))}
          {isAdmin && (
            <div className="pt-5 mt-5 border-t border-black/[0.06]">
              <p className="px-3 text-[11px] font-semibold text-[#8E8E93] mb-2">관리자</p>
              {adminMenus.map((menu) => (
                <SidebarLink key={menu.id} active={activeTab === menu.id} onClick={() => handleTabChange(menu.id)} icon={menu.icon} name={menu.name} isAdmin />
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* 🚀 메인 컨텐츠 */}
      {/* ✨ 모바일에서 상단 탭 여유를 위해 패딩 살짝 조정 */}
      <main ref={mainRef} className="flex-1 min-w-0 px-4 py-6 md:px-10 md:py-10 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {activeTab === "mypage" && <MyPageTab key="mypage" loginId={loginId} onOpenPlanEditor={handleOpenPlanEditor} />}

          {activeTab === "plan-editor" && planEditorReport && (
            <AssemblyPlanPage
              key="plan-editor"
              loginId={loginId}
              report={planEditorReport}
              onBack={() => setActiveTab("mypage")}
            />
          )}

          {activeTab === "community" && (
            <CommunityTab
              key="community"
              onNavigate={(_page, identifier) => identifier ? handleShowMemberDetail(String(identifier)) : onNavigate(_page)}
            />
          )}

          {activeTab === "team" && (
            <TeamTab
              key="team"
              loginId={loginId}
              onNavigate={(_page, identifier) => identifier ? handleShowMemberDetail(String(identifier)) : onNavigate(_page)}
              onOpenTeamPlanEditor={handleOpenTeamPlanEditor}
            />
          )}

          {activeTab === "team-plan-editor" && teamPlanEditorState && (
            <TeamPlanPage
              key="team-plan-editor"
              loginId={loginId}
              teamId={teamPlanEditorState.team.teamId}
              team={teamPlanEditorState.team}
              submission={teamPlanEditorState.submission}
              onBack={() => setActiveTab("team")}
            />
          )}

          {activeTab === "member-detail" && selectedLoginId && (
            <MemberDetailTab
              key="member-detail"
              loginId={selectedLoginId}
              onBack={() => setActiveTab(memberDetailOrigin)}
            />
          )}

          {activeTab === "attendance" && <AttendanceMemberTab key="attendance" loginId={loginId} />}

          {activeTab === "guide" && <GuideTab key="guide" />}

          {activeTab === "admin-period" && <AdminPeriodTab key="admin-period" />}

          {activeTab === "admin-attendance" && <AttendanceAdminTab key="admin-attendance" />}

          {activeTab === "admin-banner" && <AssemblyBannerAdminTab key="admin-banner" />}

          {activeTab === "admin-guide" && isAdmin && <AdminGuideTab key="admin-guide" />}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ active, onClick, icon, name }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left [&_svg]:w-[18px] [&_svg]:h-[18px] ${
      active ? "bg-[#0071E3]/10 text-[#0071E3]" : "text-[#1D1D1F]/80 hover:bg-black/[0.04]"
    }`}
  >
    <span className={active ? "text-[#0071E3]" : "text-[#8E8E93]"}>{icon}</span>
    <span className="font-semibold text-[14px] tracking-[-0.01em] flex-1">{name}</span>
    {active && <ChevronRight size={14} className="opacity-60" />}
  </button>
);
