import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, ChevronRight, School, Coffee, GraduationCap, BookOpen, UserPlus,
  Loader2, AlertCircle, Users, ShieldCheck
} from "lucide-react";
import { api } from "../../../api/axios";

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

  // 현재 조회할 기준 학기 설정
  const currentTerm = { year: 2026, semester: 1 };

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
        // 1. 전체 부원 목록 가져오기
        const memberRes = await api.get("/members/all");
        const memberList = memberRes.data;

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
                projectName: projectRes.data.projectTitle || "등록된 프로젝트가 없습니다.",
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
      <div className="mb-10 md:mb-20">
        <div className="flex items-center gap-2 mb-6 md:mb-10 px-1 md:px-2">
          <Icon className={`${colorClass} w-5 h-5 md:w-6 md:h-6`} />
          <h3 className={`text-lg md:text-2xl font-[900] uppercase tracking-tighter ${colorClass}`}>
            {title} <span className="ml-0.5 md:ml-1 text-sm md:text-xl opacity-70">({filteredMembers.length})</span>
          </h3>
        </div>

        {groupedByYear.map((group) => (
          <div key={group.year} className="mb-6 md:mb-10 last:mb-0">
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 px-1 md:px-2">
              <span className="text-xs md:text-sm font-black text-slate-400 shrink-0 whitespace-nowrap">{group.year}학번</span>
              <div className="h-px bg-slate-100 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {group.list.map((member) => (
                <motion.div
                  key={member.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => onNavigate("member-detail", member.loginId)}
                  className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-3 md:gap-5 cursor-pointer hover:border-indigo-200 hover:shadow-xl transition-all group"
                >
                  <img src={member.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-slate-50 shrink-0 shadow-sm" alt={member.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                      <span className="text-base md:text-lg font-black text-slate-900">{member.name}</span>
                      <span className="text-[8px] md:text-[10px] font-black text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-md md:rounded-lg border border-indigo-100/50">
                        {member.year}학번
                      </span>
                    </div>
                    <p className="text-[11px] md:text-xs font-bold text-slate-400 truncate group-hover:text-slate-600 transition-colors">
                      {member.projectName}
                    </p>
                  </div>
                  <ChevronRight className="text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0 w-4 h-4 md:w-5 md:h-5" />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-bold tracking-tight text-sm">프로젝트 정보를 동기화하고 있습니다...</p>
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-4 md:gap-6 px-1 md:px-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-[900] text-slate-900 tracking-tighter uppercase mb-1 md:mb-2">커뮤니티</h1>
          <p className="text-slate-400 font-bold text-[11px] md:text-sm">DEVSIGN 부원들의 실시간 프로젝트 현황입니다.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="부원 또는 프로젝트 검색"
            className="w-full pl-11 md:pl-14 pr-4 md:pr-6 py-3.5 md:py-5 bg-white border border-slate-200 rounded-xl md:rounded-[1.5rem] outline-none font-bold text-xs md:text-sm shadow-sm focus:ring-4 focus:ring-indigo-50 transition-all"
          />
        </div>
      </div>

      <MemberSection
        title="관리자"
        icon={ShieldCheck}
        colorClass="text-indigo-600"
        filterFn={(m) => isAdminMember(m)}
      />
      <MemberSection
        title="신입생 부원"
        status="신입생"
        icon={UserPlus}
        colorClass="text-cyan-600"
        filterFn={(m) => isFreshmanMember(m) && !isAdminMember(m)}
      />
      <MemberSection
        title="재학 중인 부원"
        status="재학생"
        icon={School}
        colorClass="text-green-600"
        filterFn={(m) => isAttendingMember(m) && !isAdminMember(m)}
      />
      <MemberSection
        title="휴학 중인 부원"
        status="휴학생"
        icon={Coffee}
        colorClass="text-amber-600"
        filterFn={(m) => isLeaveMember(m) && !isAdminMember(m)}
      />
      <MemberSection
        title="LAB / 대학원 부원"
        status="LAB"
        icon={BookOpen}
        colorClass="text-indigo-600"
        filterFn={(m) => isLabMember(m) && !isAdminMember(m)}
      />
      <MemberSection
        title="졸업한 부원"
        status="졸업생"
        icon={GraduationCap}
        colorClass="text-slate-400"
        filterFn={(m) => isGraduateMember(m) && !isAdminMember(m)}
      />
      <MemberSection
        title="기타 상태 부원"
        status="기타"
        icon={Users}
        colorClass="text-slate-500"
        filterFn={(m) => isOtherMember(m) && !isAdminMember(m)}
      />

      {members.length === 0 && (
        <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-[3rem] border border-dashed border-slate-200 mx-1 md:mx-0">
          <Users size={40} className="mx-auto text-slate-200 mb-3 md:mb-4" />
          <p className="text-slate-400 font-bold text-sm md:text-base">등록된 부원이 없습니다.</p>
        </div>
      )}
    </motion.div>
  );
};