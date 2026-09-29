import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, ChevronRight, School, Coffee, GraduationCap, BookOpen, UserPlus,
  Loader2, AlertCircle, Users, ShieldCheck
} from "lucide-react";
import { api } from "../../../api/axios";
import { CARD, PageHeader } from "../../assembly/assemblyUi";

// onNavigate의 인자 타입을 string(loginId)으로 처리할 수 있도록 설정
export const CommunityTab = ({ onNavigate = () => { } }: { onNavigate?: (page: string, identifier?: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const normalizeText = (value?: string) => String(value || "").trim();
  const normalizeUpper = (value?: string) => normalizeText(value).toUpperCase();
  const statusKey = (member: any) => {
    const role = normalizeUpper(member?.role);
    const status = normalizeText(member?.userStatus);
    const upper = normalizeUpper(status);

    if (role.includes("ADMIN") || status === "관리자") return "ADMIN";
    if (status === "재학생" || upper === "ATTENDING") return "ATTENDING";
    if (status === "신입생" || upper === "FRESHMAN" || upper === "NEWBIE" || upper === "NEW") return "FRESHMAN";
    if (status === "휴학생" || upper === "LEAVE") return "LEAVE";
    if (status === "LAB" || status === "대학원" || upper === "LAB" || upper === "GRADUATE") return "LAB";
    if (status === "졸업생" || status === "일반" || upper === "ALUMNI" || upper === "GENERAL" || upper === "GRADUATED") return "GRADUATE";
    return "OTHER";
  };

  const isAdminMember = (member: any) => {
    return statusKey(member) === "ADMIN";
  };

  const isAttendingMember = (member: any) => {
    return statusKey(member) === "ATTENDING";
  };

  const isLeaveMember = (member: any) => {
    return statusKey(member) === "LEAVE";
  };

  const isFreshmanMember = (member: any) => {
    return statusKey(member) === "FRESHMAN";
  };

  const isLabMember = (member: any) => {
    return statusKey(member) === "LAB";
  };

  const isGraduateMember = (member: any) => {
    return statusKey(member) === "GRADUATE";
  };

  const isOtherMember = (member: any) => {
    return statusKey(member) === "OTHER";
  };

  // ✨ [2026-09-30] 상태별 바로가기 알약
  const GROUPS: { id: string; label: string; test: (m: any) => boolean }[] = [
    { id: "all", label: "전체", test: () => true },
    { id: "admin", label: "관리자", test: (m) => isAdminMember(m) },
    { id: "freshman", label: "신입생", test: (m) => isFreshmanMember(m) && !isAdminMember(m) },
    { id: "attending", label: "재학", test: (m) => isAttendingMember(m) && !isAdminMember(m) },
    { id: "leave", label: "휴학", test: (m) => isLeaveMember(m) && !isAdminMember(m) },
    { id: "lab", label: "LAB · 대학원", test: (m) => isLabMember(m) && !isAdminMember(m) },
    { id: "graduate", label: "졸업", test: (m) => isGraduateMember(m) && !isAdminMember(m) },
    { id: "other", label: "기타", test: (m) => isOtherMember(m) && !isAdminMember(m) },
  ];
  const [groupFilter, setGroupFilter] = useState("all");
  const showGroup = (id: string) => groupFilter === "all" || groupFilter === id;

  // 현재 조회할 기준 학기 설정 — 2~7월=1학기, 8월~다음해 1월=2학기 (MyPageTab과 동일 규칙)
  // 이전엔 { year: 2026, semester: 1 }로 고정되어 있어서 2학기가 되어도 계속 1학기 자료가 보이던 버그가 있었음
  const currentTerm = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const semester = (month >= 2 && month <= 7) ? 1 : 2;
    const academicYear = (month === 1) ? year - 1 : year;
    return { year: academicYear, semester };
  }, []);

  // ✨ 학번 포맷팅 함수 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "??";
    const strId = String(id).trim();

    // 1. 이미 '학번' 글자가 포함되어 있다면 숫자만 추출 시도 (예: "22학번" -> "22")
    if (strId.includes("학번")) {
      return strId.replace(/[^0-9]/g, "");
    }
    // 2. 8자리 학번인 경우 (예: 20221234 -> 22)
    if (strId.length === 8) {
      return strId.substring(2, 4);
    }
    // 3. 2자리인 경우 (예: 22 -> 22)
    if (strId.length === 2) {
      return strId;
    }
    return strId;
  };

  useEffect(() => {
    const fetchMembersAndProjects = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // 1. 전체 부원 목록 가져오기 — "나간 인원"으로 표시된 회원은 커뮤니티에서 제외
        // (관리 탭 "디스코드 확인"에서 관리자가 지정. 계정 삭제/정지와는 별개, DB 데이터는 그대로 유지됨)
        const memberRes = await api.get("/members/all");
        const memberList = memberRes.data.filter((m: any) => !m.departed);

        // 2. 각 부원별 이번 학기 프로젝트 제목 가져오기
        const updatedMembers = await Promise.all(
          memberList.map(async (m: any) => {
            try {
              const projectRes = await api.get("/assembly/my-submissions", {
                params: {
                  loginId: m.loginId,
                  year: currentTerm.year,
                  semester: currentTerm.semester
                }
              });

              const yearValue = formatStudentId(m.studentId);

              return {
                ...m,
                year: yearValue,
                projectName: projectRes.data.projectTitle || "",
                avatar: m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`
              };
            } catch (err) {
              const yearValue = formatStudentId(m.studentId);
              return {
                ...m,
                year: yearValue,
                projectName: "정보를 불러올 수 없음",
                avatar: m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`
              };
            }
          })
        );

        setMembers(updatedMembers);
        setIsLoading(false);
      } catch (e) {
        console.error("데이터 로드 에러:", e);
        setIsError(true);
        setIsLoading(false);
      }
    };
    fetchMembersAndProjects();
  }, []);

  const MemberSection = ({
    title,
    status,
    icon: Icon,
    colorClass,
    filterFn
  }: {
    title: string,
    status?: string,
    icon: any,
    colorClass: string,
    filterFn?: (member: any) => boolean
  }) => {

    const filteredMembers = members
      .filter(m => {
        if (filterFn) return filterFn(m);
        return m.userStatus === status;
      })
      .filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
      );

    const groupedByYear = useMemo(() => {
      const groups: { [key: string]: any[] } = {};

      filteredMembers.forEach(m => {
        const year = m.year;
        if (!groups[year]) {
          groups[year] = [];
        }
        groups[year].push(m);
      });

      return Object.keys(groups)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(year => ({
          year,
          list: groups[year]
        }));
    }, [filteredMembers]);

    if (filteredMembers.length === 0) return null;

    return (
      <section className="mb-10 md:mb-14">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Icon className={`${colorClass} w-[18px] h-[18px]`} />
          <h2 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em]">{title}</h2>
          <span className="text-sm font-semibold text-[#AEAEB2]">{filteredMembers.length}</span>
        </div>

        {groupedByYear.map((group) => (
          <div key={group.year} className="mb-5 last:mb-0">
            <div className="flex items-center gap-3 mb-2.5 px-1">
              <span className="text-xs font-semibold text-[#8E8E93] shrink-0">{group.year}학번</span>
              <div className="h-px bg-black/[0.06] flex-1" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">
              {group.list.map((member) => (
                <motion.button
                  type="button"
                  key={member.id}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  onClick={() => onNavigate("member-detail", member.loginId)}
                  className={`${CARD} group w-full text-left p-3.5 md:p-4 rounded-2xl flex items-center gap-3 hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)] transition-shadow`}
                >
                  <img
                    src={member.avatar}
                    className="w-11 h-11 md:w-12 md:h-12 rounded-full object-cover shrink-0 ring-1 ring-black/[0.06]"
                    alt=""
                    onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=F2F2F7&color=1D1D1F`; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[15px] font-semibold text-[#1D1D1F] truncate tracking-[-0.01em]">{member.name}</span>
                      <span className="text-[10px] font-semibold text-[#6E6E73] bg-black/[0.05] px-1.5 py-0.5 rounded-md shrink-0">
                        {member.year}학번
                      </span>
                    </div>
                    <p className={`text-[13px] truncate ${member.projectName ? "text-[#6E6E73]" : "text-[#C7C7CC]"}`}>
                      {member.projectName || "프로젝트 미등록"}
                    </p>
                  </div>
                  <ChevronRight className="text-[#C7C7CC] group-hover:text-[#8E8E93] transition-colors shrink-0 w-4 h-4" />
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </section>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
        <Loader2 className="animate-spin text-[#8E8E93]" size={28} />
        <p className="text-[#8E8E93] text-sm">부원 정보를 불러오는 중이에요...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-slate-900 font-black text-lg">데이터를 불러올 수 없습니다.</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm">다시 시도</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-16">
      <PageHeader
        title="커뮤니티"
        desc="DEVSIGN 부원들의 이번 학기 프로젝트예요. 부원을 누르면 자세히 볼 수 있어요."
        right={
          <label className={`${CARD} relative flex items-center w-full sm:w-72 h-10 rounded-full pl-10 pr-4`}>
            <Search className="absolute left-3.5 text-[#8E8E93] w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름 또는 프로젝트 검색"
              className="w-full bg-transparent outline-none text-sm text-[#1D1D1F] placeholder:text-[#AEAEB2] !border-0 !shadow-none"
            />
          </label>
        }
      />

      {/* 상태별 바로가기 */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-8 -mx-1 px-1">
        {GROUPS.map((g) => {
          const count = g.id === "all" ? members.length : members.filter(g.test).length;
          if (g.id !== "all" && count === 0) return null;
          const active = groupFilter === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroupFilter(g.id)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
                active ? "bg-[#1D1D1F] text-white" : "bg-[#fff] text-[#1D1D1F]/70 border border-black/[0.06] hover:text-[#1D1D1F]"
              }`}
            >
              {g.label} <span className={active ? "text-white/60" : "text-[#AEAEB2]"}>{count}</span>
            </button>
          );
        })}
      </div>

      {showGroup("admin") && (<MemberSection
        title="관리자"
        icon={ShieldCheck}
        colorClass="text-[#0071E3]"
        filterFn={(m) => isAdminMember(m)}
      />)}
      {showGroup("freshman") && (<MemberSection
        title="신입생 부원"
        status="신입생"
        icon={UserPlus}
        colorClass="text-[#32ADE6]"
        filterFn={(m) => isFreshmanMember(m) && !isAdminMember(m)}
      />)}
      {showGroup("attending") && (<MemberSection
        title="재학 중인 부원"
        status="재학생"
        icon={School}
        colorClass="text-[#34C759]"
        filterFn={(m) => isAttendingMember(m) && !isAdminMember(m)}
      />)}
      {showGroup("leave") && (<MemberSection
        title="휴학 중인 부원"
        status="휴학생"
        icon={Coffee}
        colorClass="text-[#FF9500]"
        filterFn={(m) => isLeaveMember(m) && !isAdminMember(m)}
      />)}
      {showGroup("lab") && (<MemberSection
        title="LAB / 대학원 부원"
        status="LAB"
        icon={BookOpen}
        colorClass="text-[#AF52DE]"
        filterFn={(m) => isLabMember(m) && !isAdminMember(m)}
      />)}
      {showGroup("graduate") && (<MemberSection
        title="졸업한 부원"
        status="졸업생"
        icon={GraduationCap}
        colorClass="text-[#8E8E93]"
        filterFn={(m) => isGraduateMember(m) && !isAdminMember(m)}
      />)}
      {showGroup("other") && (<MemberSection
        title="기타 상태 부원"
        status="기타"
        icon={Users}
        colorClass="text-[#8E8E93]"
        filterFn={(m) => isOtherMember(m) && !isAdminMember(m)}
      />)}

      {members.length === 0 && (
        <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-[3rem] border border-dashed border-slate-200 mx-1 md:mx-0">
          <Users size={40} className="mx-auto text-slate-200 mb-3 md:mb-4" />
          <p className="text-slate-400 font-bold text-sm md:text-base">등록된 부원이 없습니다.</p>
        </div>
      )}
    </motion.div>
  );
};