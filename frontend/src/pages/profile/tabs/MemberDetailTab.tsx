import { api } from "../../../api/axios";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reportKind } from "../../assembly/assemblyUi";
import { PlanContentView, PlanSummaryCard } from "../../assembly/components/PlanSummary";
import {
  ArrowLeft, FileText, X,
  Download, Presentation, CalendarDays, MessageCircle,
  FileArchive, ExternalLink, Loader2, ChevronDown, Eye,
  Layers, Crown, Link2, User, Star,
} from "lucide-react";

// 대표 프로젝트 표시 — 마이페이지 "내 프로젝트" 아이콘의 별과 같은 모양
const RepStar = () => (
  <span title="대표 프로젝트" className="inline-flex items-center justify-center w-4 h-4 ml-1.5 -mt-0.5 align-middle rounded-full bg-[#FF9F0A]">
    <Star className="w-2.5 h-2.5 text-white" fill="currentColor" strokeWidth={0} />
  </span>
);

// MyPageTab/TeamTab과 동일한 규칙: 2~7월=1학기, 8월~다음해 1월=2학기
const getCurrentTerm = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const semester = (month >= 2 && month <= 7) ? 1 : 2;
  const academicYear = (month === 1) ? year - 1 : year;
  return { year: academicYear, semester };
};

// ✨ TeamTab/CommunityTab과 동일한 학번 포맷 규칙
const formatShortStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

// 부모 컴포넌트(AssemblyPage)로부터 전달받는 프롭스 정의
interface MemberDetailProps {
  loginId: string;
  onBack: () => void;
}

export const MemberDetailTab = ({ loginId, onBack }: MemberDetailProps) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ✨ [2026-09-21] 한 학기에 여러 팀에 속할 수 있어 목록으로 받고, 아래에서 골라서 본다.
  // 개인 프로젝트(프로젝트 타임라인/링크)와는 완전히 별개로 표시된다.
  const [teamList, setTeamList] = useState<any[]>([]);
  // "personal" 또는 teamId — 무엇을 보고 있는지. 카드와 아래 타임라인이 함께 바뀐다.
  const [selectedProjectKey, setSelectedProjectKey] = useState<"personal" | number>("personal");
  // ✨ [2026-09-30] 부원이 마이페이지에서 고른 대표 프로젝트(안 골랐으면 서버가 자동으로 정한 것) — 들어오면 이걸 먼저 보여준다
  const [representativeKey, setRepresentativeKey] = useState<"personal" | number | null>(null);
  const [teamSubmissionsByTeam, setTeamSubmissionsByTeam] = useState<Record<number, any[]>>({});

  // 학기 선택 상태 — 예전엔 { year: 2026, semester: 1 }로 고정되어 있어서, 실제로 2학기가
  // 되어도 커뮤니티에서 다른 부원을 보면 계속 1학기 자료가 뜨던 버그가 있었음. MyPageTab과
  // 동일하게 현재 날짜 기준으로 계산한 "진짜 현재 학기"를 기본값으로 사용하도록 수정.
  const [selectedTerm, setSelectedTerm] = useState(getCurrentTerm);
  const [isTermMenuOpen, setIsTermMenuOpen] = useState(false);
  const termMenuRef = useRef<HTMLDivElement>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [projectLinks, setProjectLinks] = useState<{ label: string; url: string }[]>([]);

  const isPersonalView = selectedProjectKey === "personal";
  const selectedTeam = useMemo(
    () => (isPersonalView ? null : teamList.find((t: any) => t.teamId === selectedProjectKey) ?? null),
    [teamList, selectedProjectKey, isPersonalView]
  );

  // 선택한 팀의 제출 자료를 그때그때 불러와 캐시 (개인은 위에서 받은 reports를 그대로 씀)
  useEffect(() => {
    if (isPersonalView || typeof selectedProjectKey !== "number") return;
    if (teamSubmissionsByTeam[selectedProjectKey]) return;
    api.get("/team-submissions/my", {
      params: { teamId: selectedProjectKey, year: selectedTerm.year, semester: selectedTerm.semester },
    })
      .then((res) => setTeamSubmissionsByTeam((prev) => ({ ...prev, [selectedProjectKey]: res.data || [] })))
      .catch(() => setTeamSubmissionsByTeam((prev) => ({ ...prev, [selectedProjectKey]: [] })));
  }, [selectedProjectKey, isPersonalView, selectedTerm, teamSubmissionsByTeam]);

  // 화면에 보여줄 타임라인 — 개인 프로젝트면 개인 제출, 팀이면 그 팀의 공유 자료
  const timelineItems = useMemo(
    () => (isPersonalView ? reports : teamSubmissionsByTeam[selectedProjectKey as number] ?? []),
    [isPersonalView, reports, teamSubmissionsByTeam, selectedProjectKey]
  );

  const isSubmittedStatus = (status?: string) =>
    status === "SUBMITTED" || status === "제출완료";

  // 지금 보고 있는 프로젝트의 관련 링크 — 개인은 마이페이지 링크, 팀은 팀 탭 링크
  const visibleLinks: any[] = isPersonalView ? projectLinks : (selectedTeam?.links || []);
  // 지금 보고 있는 프로젝트의 제출된 계획서(3·9월)
  const visiblePlan = timelineItems.find((r: any) => (r.month === 3 || r.month === 9) && isSubmittedStatus(r.status));

  // 2026년 1학기부터 현재 학기까지 전부 선택 가능하게(MyPageTab의 semesterOptions와 동일 규칙)
  const termOptions = useMemo(() => {
    const { year: currentYear, semester: currentSemester } = getCurrentTerm();
    const startYear = 2026;
    const options: { year: number; semester: number; label: string }[] = [];
    let tempYear = startYear;
    let tempSem = 1;
    while (tempYear < currentYear || (tempYear === currentYear && tempSem <= currentSemester)) {
      options.push({ year: tempYear, semester: tempSem, label: `${tempYear}학년도 ${tempSem}학기` });
      tempSem++;
      if (tempSem > 2) { tempSem = 1; tempYear++; }
    }
    return options.reverse();
  }, []);

  // ✨ 학번 포맷팅 함수 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "??";
    const strId = String(id).trim();

    // 1. 이미 '학번' 글자가 포함되어 있다면 그대로 반환
    if (strId.includes("학번")) return strId;

    // 2. 8자리 학번인 경우 (예: 20221234 -> 22학번)
    if (strId.length === 8) {
      return `${strId.substring(2, 4)}학번`;
    }

    // 3. 2자리인 경우 (예: 22 -> 22학번)
    if (strId.length === 2) {
      return `${strId}학번`;
    }

    // 4. 기타 케이스는 뒤에 '학번'만 붙여서 반환
    return `${strId}학번`;
  };

  // 📡 데이터 로드 로직: 백엔드 Admin 및 Assembly 컨트롤러와 연동
  useEffect(() => {
    const fetchFullData = async () => {
      setIsLoading(true);
      try {
        // 1. 전체 부원 목록 조회 (MemberController: /api/members/all)
        const memberRes = await api.get(`/members/all`);

        const targetMember = memberRes.data.find(
          (m: any) => String(m.loginId) === String(loginId) || String(m.id) === String(loginId)
        );

        if (!targetMember) {
          console.error(`아이디 ${loginId}에 해당하는 부원이 목록에 없습니다.`);
          setMemberInfo(null);
          return;
        }

        // 2. 해당 부원의 이번 학기 제출 현황 조회 (AssemblyController: /api/assembly/my-submissions)
        const submissionRes = await api.get(`/assembly/my-submissions`, {
          params: {
            loginId: targetMember.loginId,
            year: selectedTerm.year,
            semester: selectedTerm.semester
          }
        });

        // 3. 화면 표시 데이터 설정
        setMemberInfo({
          ...targetMember,
          displayStudentId: formatStudentId(targetMember.studentId),
          projectTitle: submissionRes.data.projectTitle
        });

        setReports(submissionRes.data.reports || []);
        setProjectLinks(submissionRes.data.projectLinks || []);

        // 4. 이번 학기 팀 프로젝트 소속 여부 (기존 팀 프로젝트 기능이 이미 쓰던 엔드포인트 재사용)
        let teams: any[] = [];
        try {
          const teamRes = await api.get("/teams/my", {
            params: { loginId: targetMember.loginId, year: selectedTerm.year, semester: selectedTerm.semester },
          });
          teams = teamRes.data?.teams || [];
        } catch {
          teams = [];
        }
        setTeamList(teams);

        const rep = submissionRes.data.representative;
        const repTeamId = rep?.type === "TEAM" ? Number(String(rep.key).split(":")[1]) : NaN;
        const repKey: "personal" | number | null =
          rep?.type === "TEAM"
            ? (teams.some((t: any) => Number(t.teamId) === repTeamId) ? repTeamId : null)
            : rep?.type === "PERSONAL" ? "personal" : null;
        setRepresentativeKey(repKey);
        setSelectedProjectKey(repKey ?? "personal");
        setTeamSubmissionsByTeam({});

      } catch (e) {
        console.error("데이터 로딩 중 에러 발생:", e);
        setMemberInfo(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullData();
  }, [loginId, selectedTerm]);

  // 학기 선택 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termMenuRef.current && !termMenuRef.current.contains(event.target as Node)) {
        setIsTermMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const getFilenameFromDisposition = (contentDisposition?: string, fallback = "downloaded-file") => {
    if (!contentDisposition) return fallback;

    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);

    const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
    if (plainMatch?.[1]) return plainMatch[1];

    return fallback;
  };

  const closePreviewPdf = () => {
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
    }
    setPreviewPdfUrl(null);
  };

  const handleDownload = async (path: string) => {
    if (!path) return;
    try {
      const response = await api.get("/assembly/download", {
        params: { path },
        responseType: "blob"
      });

      const fallbackName = path.split(/[\\/]/).pop() || "downloaded-file";
      const filename = getFilenameFromDisposition(response.headers["content-disposition"], fallbackName);

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("파일 다운로드 실패:", e);
      alert("파일 다운로드 중 오류가 발생했습니다.");
    }
  };

  // ✨ [2026-09-30] 웹 계획서 PDF — 개인은 reportId, 팀은 submissionId로 서버에서 만들어 받는다
  const openPlanPdf = async (preview: boolean) => {
    if (!selectedReport?.id) return;
    try {
      const response = isPersonalView
        ? await api.get("/assembly/plan/pdf", { params: { reportId: selectedReport.id }, responseType: "blob" })
        : await api.get("/team-submissions/plan/pdf", { params: { submissionId: selectedReport.id }, responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      if (preview) {
        if (previewPdfUrl) window.URL.revokeObjectURL(previewPdfUrl);
        setPreviewPdfUrl(window.URL.createObjectURL(blob));
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getFilenameFromDisposition(response.headers["content-disposition"], `${memberInfo?.name ?? ""}_계획서.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert("계획서 PDF를 만들지 못했어요.");
    }
  };

  const handlePreviewPdf = async (path: string) => {
    if (!path) return;
    try {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }

      const response = await api.get("/assembly/download", {
        params: { path },
        responseType: "blob"
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      setPreviewPdfUrl(blobUrl);
    } catch (e) {
      console.error("PDF 미리보기 로드 실패:", e);
      alert("PDF 미리보기를 불러오는 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-slate-400 font-bold tracking-tight text-sm">부원 상세 정보를 동기화하고 있습니다...</p>
      </div>
    );
  }

  if (!memberInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-40 gap-6">
        <div className="p-4 md:p-6 bg-slate-100 rounded-2xl md:rounded-[2rem] text-slate-400"><X size={32} /></div>
        <div className="text-center px-6">
          <p className="text-slate-900 font-black text-lg md:text-xl mb-1">부원 정보를 찾을 수 없습니다.</p>
          <p className="text-slate-400 font-bold text-xs md:text-sm">아이디({loginId}) 정보를 다시 확인해주세요.</p>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs md:text-sm">목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-16 md:pb-20">

      {/* ✨ [2026-09-30] 애플 스타일 머리말 — 뒤로 가기 + 이름/학번 + 현재 프로젝트, 오른쪽에 학기 선택 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <button onClick={onBack} aria-label="뒤로" className="w-10 h-10 rounded-full bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] text-[#1D1D1F] flex items-center justify-center hover:bg-[#F5F5F7] transition-colors shrink-0">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] md:text-[32px] font-bold text-[#1D1D1F] tracking-[-0.02em] truncate">{memberInfo.name}</h1>
              <span className="px-2 py-0.5 bg-black/[0.05] text-[#6E6E73] text-[11px] font-semibold rounded-md shrink-0">
                {memberInfo.displayStudentId}
              </span>
            </div>
            <p className="text-[#6E6E73] text-sm truncate mt-0.5">
              {isPersonalView
                ? (memberInfo.projectTitle || "개인 프로젝트 미등록")
                : (selectedTeam?.projectTitle || "프로젝트 명 미등록")}
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-auto" ref={termMenuRef}>
          <button onClick={() => setIsTermMenuOpen(!isTermMenuOpen)} className="bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] w-full md:w-auto flex items-center justify-between gap-3 h-10 px-4 rounded-full">
            <span className="flex items-center gap-2">
              <CalendarDays className="text-[#8E8E93] w-4 h-4" />
              <span className="font-semibold text-[#1D1D1F] text-sm">{selectedTerm.year}년 {selectedTerm.semester}학기</span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
          </button>
          <AnimatePresence>
            {isTermMenuOpen && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute right-0 mt-2 w-full md:w-52 bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] rounded-2xl shadow-[0_12px_32px_rgb(0_0_0/0.12)] z-50 p-1.5">
                {termOptions.map((option) => (
                  <button key={`${option.year}-${option.semester}`} onClick={() => { setSelectedTerm({ year: option.year, semester: option.semester }); setIsTermMenuOpen(false); }} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold ${selectedTerm.year === option.year && selectedTerm.semester === option.semester ? "bg-[#0071E3]/10 text-[#0071E3]" : "text-[#1D1D1F] hover:bg-black/[0.04]"}`}>
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ✨ [2026-09-07 추가] 이번 학기 관련 링크(깃/노션 등) — 마이페이지에서 등록한 것을 읽기 전용으로 노출 */}
      {/* ✨ [2026-09-30] 팀을 보고 있으면 팀 탭에서 등록한 팀 링크 */}
      {visibleLinks.length > 0 && (
        <div className="mb-6 bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-4 md:p-5 rounded-3xl">
          <p className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-[#6E6E73]"><Link2 size={13} /> 관련 링크</p>
          <div className="flex flex-wrap gap-2">
            {visibleLinks.map((link: any, idx: number) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 pl-3.5 pr-3 h-9 bg-[#F5F5F7] hover:bg-[#0071E3]/10 rounded-full transition-colors group"
              >
                <span className="text-sm font-semibold text-[#1D1D1F] group-hover:text-[#0071E3]">{link.label}</span>
                <ExternalLink size={12} className="text-[#AEAEB2] group-hover:text-[#0071E3]" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ✨ [2026-09-21] 개인 / 팀 프로젝트 선택 — 고른 프로젝트에 맞춰 아래 타임라인도 함께 바뀐다 */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedProjectKey("personal")}
            className={`h-9 px-4 rounded-full font-semibold text-[13px] whitespace-nowrap transition-colors border ${
              isPersonalView ? "bg-[#1D1D1F] text-white border-[#1D1D1F]" : "bg-[#fff] text-[#1D1D1F]/70 border-black/[0.06] hover:text-[#1D1D1F]"
            }`}
          >
            <User size={12} className="inline mr-1.5 -mt-0.5" /> 개인 프로젝트
            {representativeKey === "personal" && <RepStar />}
          </button>
          {teamList.map((t: any) => (
            <button
              key={t.teamId}
              onClick={() => setSelectedProjectKey(t.teamId)}
              className={`h-9 px-4 rounded-full font-semibold text-[13px] whitespace-nowrap transition-colors border ${
                selectedProjectKey === t.teamId ? "bg-[#1D1D1F] text-white border-[#1D1D1F]" : "bg-[#fff] text-[#1D1D1F]/70 border-black/[0.06] hover:text-[#1D1D1F]"
              }`}
            >
              <Layers size={12} className="inline mr-1.5 -mt-0.5" /> {t.teamName}
              {representativeKey === Number(t.teamId) && <RepStar />}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 프로젝트 정보 카드 */}
      <div className="mb-8 md:mb-10 bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-5 md:p-6 rounded-3xl">
        <div className="flex items-center gap-1.5 mb-2 text-[#6E6E73]">
          {isPersonalView ? <User size={13} /> : <Layers size={13} />}
          <p className="text-xs font-semibold">
            {isPersonalView ? "개인 프로젝트" : "팀 프로젝트"}
          </p>
        </div>

        {isPersonalView ? (
          <>
            <h4 className="font-bold text-[#1D1D1F] text-lg md:text-xl tracking-[-0.01em] mb-1">
              {memberInfo.projectTitle || "등록된 개인 프로젝트가 없습니다"}
            </h4>
            <p className="text-[#8E8E93] text-sm">
              {memberInfo.name} 님이 개인으로 진행한 프로젝트예요.
            </p>
          </>
        ) : selectedTeam ? (
          <>
            {/* 팀명 + 프로젝트 명 */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h4 className="font-bold text-[#1D1D1F] text-lg md:text-xl tracking-[-0.01em]">{selectedTeam.teamName}</h4>
              <span className="px-2 py-0.5 rounded-md bg-black/[0.05] text-[#6E6E73] text-[11px] font-semibold">
                팀원 {(selectedTeam.members || []).length}명
              </span>
            </div>
            <p className="text-[#6E6E73] text-sm mb-4">
              {selectedTeam.projectTitle || "프로젝트 명 미등록"}
            </p>

            {/* 팀원 — 프로필 사진 + 팀장 표시 */}
            <p className="text-xs font-semibold text-[#8E8E93] mb-2">팀원</p>
            <div className="flex flex-wrap gap-2">
              {(selectedTeam.members || []).map((m: any) => (
                <div
                  key={m.teamMemberId}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border ${
                    m.isLeader ? "bg-[#FF9500]/[0.08] border-[#FF9500]/25" : "bg-[#F5F5F7] border-transparent"
                  }`}
                >
                  <img
                    src={m.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`}
                    onError={(e: any) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=6366f1`; }}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover shrink-0"
                    alt={m.name}
                  />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-[#1D1D1F] flex items-center gap-1">
                      {formatShortStudentId(m.studentId)} {m.name}
                      {m.isLeader && <Crown size={11} className="text-amber-500 shrink-0" />}
                    </span>
                    <span className={`text-[10px] font-semibold ${m.isLeader ? "text-[#C93400]" : "text-[#8E8E93]"}`}>
                      {m.isLeader ? "팀장" : "팀원"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* 📋 리포트 타임라인 — ✨ [2026-09-30] PLAN/PROGRESS/RESULT 배지 없이 "계획서·진행 보고·결과 보고"로, 미제출은 "계획서 미제출" */}
      <div className="mb-10">
        <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em] mb-3 md:mb-4 px-1">
          {isPersonalView ? "개인 프로젝트 기록" : `${selectedTeam?.teamName ?? "팀"} 기록`}
        </h3>
        {timelineItems.length === 0 ? (
          <div className="text-center py-14 bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] rounded-3xl text-[#8E8E93] text-sm">
            {isPersonalView ? "이 학기에 만든 자료가 없어요." : "이 팀이 제출한 자료가 없어요."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timelineItems.map((report: any) => {
              const done = isSubmittedStatus(report.status);
              const kind = reportKind(Number(report.month));
              return (
                <motion.button
                  type="button"
                  key={report.id}
                  whileHover={done ? { y: -2 } : {}}
                  onClick={() => done && setSelectedReport(report)}
                  disabled={!done}
                  className={`bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] group w-full text-left p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-4 transition-shadow ${done ? "hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)]" : "cursor-default"}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${done ? "bg-[#34C759]/10" : "bg-black/[0.04]"}`}>
                    <span className={`text-base font-bold leading-none tracking-[-0.02em] whitespace-nowrap ${done ? "text-[#248A3D]" : "text-[#AEAEB2]"}`}>{report.month}월</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-[#8E8E93] mb-0.5">{kind}</p>
                    <p className={`text-[15px] font-semibold truncate tracking-[-0.01em] ${done ? "text-[#1D1D1F]" : "text-[#AEAEB2]"}`}>
                      {done ? (report.title || report.memo || `${kind} 제출`) : `${kind} 미제출`}
                    </p>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">
                      {done ? `${report.date || "최근"} 제출` : "아직 기록이 없어요"}
                    </p>
                  </div>
                  {done && <Download className="w-4 h-4 text-[#C7C7CC] group-hover:text-[#0071E3] shrink-0 transition-colors" />}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ✨ [2026-09-30] 계획서 요약 — 보고 있는 프로젝트(개인/팀)의 제출된 계획서를 정리해서 보여준다 */}
      {visiblePlan && (
        <div className="mt-10 md:mt-12">
          <h3 className="text-lg md:text-xl font-bold text-[#1D1D1F] tracking-[-0.01em] mb-3 md:mb-4 px-1">계획서 요약</h3>
          <PlanSummaryCard
            plan={visiblePlan}
            title={visiblePlan.memo || (isPersonalView ? memberInfo?.projectTitle : selectedTeam?.projectTitle)}
            emptyText="계획서를 파일로 제출해서 정리된 내용이 없어요. 위 기록에서 계획서를 눌러 파일을 확인해 보세요."
            showStatus={false}
          />
        </div>
      )}

      {/* 🔮 상세 정보 모달 */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-4 md:px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: "spring", stiffness: 400, damping: 34 }} className="relative w-full max-w-lg bg-[#fff] rounded-[28px] p-5 md:p-7 shadow-[0_20px_60px_rgb(0_0_0/0.18)] max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div>
                  <p className="text-xs font-semibold text-[#8E8E93]">{memberInfo.name} · {selectedReport.month}월 {reportKind(Number(selectedReport.month))}</p>
                  <h3 className="text-xl md:text-2xl font-bold text-[#1D1D1F] tracking-[-0.02em] mt-0.5">{selectedReport.title || selectedReport.memo || (!isPersonalView && selectedTeam?.projectTitle) || "제목 없음"}</h3>
                </div>
                <button onClick={() => setSelectedReport(null)} aria-label="닫기" className="w-8 h-8 rounded-full bg-black/[0.05] text-[#6E6E73] flex items-center justify-center hover:bg-black/[0.08] shrink-0"><X className="w-4 h-4" /></button>
              </div>
              {isWebPlan(selectedReport) ? (
                // ✨ [2026-09-30] 웹으로 작성한 계획서 — 파일 칸 대신 계획서 내용을 그대로 보여주고 PDF로 미리보기/다운로드
                <>
                  <div className="mb-6"><PlanContentView plan={selectedReport} /></div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => openPlanPdf(true)} className="h-11 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#0071E3]/15">
                      <Eye className="w-4 h-4" /> PDF 미리보기
                    </button>
                    <button onClick={() => openPlanPdf(false)} className="h-11 rounded-2xl bg-[#0071E3] text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#0077ED]">
                      <Download className="w-4 h-4" /> PDF 다운로드
                    </button>
                  </div>
                  {selectedReport.planFilePath && (
                    <div className="mb-2">
                      <DownloadSlot
                        label="계획서 원본 파일"
                        path={selectedReport.planFilePath}
                        onDownload={() => handleDownload(selectedReport.planFilePath)}
                        onPreview={/\.pdf$/i.test(selectedReport.planFilePath) ? () => handlePreviewPdf(selectedReport.planFilePath) : undefined}
                      />
                    </div>
                  )}
                  <div className="mb-4" />
                </>
              ) : (
                <>
              <div className="mb-5">
                <p className="flex items-center gap-1.5 mb-2 ml-1 text-xs font-semibold text-[#6E6E73]"><MessageCircle className="w-3.5 h-3.5" /> 활동 요약</p>
                <div className="w-full p-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] text-sm whitespace-pre-wrap leading-relaxed">{selectedReport.memo || "작성된 요약이 없어요."}</div>
              </div>
              <div className="mb-6">
                <p className="text-xs font-semibold text-[#6E6E73] ml-1 mb-2">첨부 파일</p>
                <div className="grid grid-cols-1 gap-2">
                  <DownloadSlot label="발표자료 (PPT)" path={selectedReport.presentationPath} onDownload={() => handleDownload(selectedReport.presentationPath)} />
                  <DownloadSlot label="PDF 보고서" path={selectedReport.pdfPath} onDownload={() => handleDownload(selectedReport.pdfPath)} onPreview={() => handlePreviewPdf(selectedReport.pdfPath)} />
                  <DownloadSlot label="기타 부속 자료" path={selectedReport.otherPath} onDownload={() => handleDownload(selectedReport.otherPath)} />
                  {selectedReport.planFilePath && (
                    <DownloadSlot
                      label="계획서 원본 파일"
                      path={selectedReport.planFilePath}
                      onDownload={() => handleDownload(selectedReport.planFilePath)}
                      onPreview={/\.pdf$/i.test(selectedReport.planFilePath) ? () => handlePreviewPdf(selectedReport.planFilePath) : undefined}
                    />
                  )}
                </div>
              </div>
                </>
              )}
              <button onClick={() => setSelectedReport(null)} className="w-full h-12 bg-black/[0.05] text-[#1D1D1F] rounded-2xl font-semibold text-sm hover:bg-black/[0.08] transition-colors">닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🖼️ PDF 미리보기 */}
      <AnimatePresence>
        {previewPdfUrl && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={closePreviewPdf} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-5xl bg-white h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FileText className="w-4 h-4 md:w-5 md:h-5" /></div>
                  <span className="font-black text-slate-900 text-sm md:text-base">PDF 미리보기</span>
                </div>
                <button onClick={closePreviewPdf} className="p-2 md:p-3 bg-slate-50 text-slate-400 rounded-lg md:rounded-xl hover:bg-slate-100 transition-all"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
              <div className="flex-1 bg-slate-100 relative">
                <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 📥 하위 컴포넌트: 파일 슬롯 (모바일 최적화)
const DownloadSlot = ({ label, path, onDownload, onPreview }: any) => (
  <div className={`flex items-center justify-between gap-3 p-3 rounded-2xl ${path ? "bg-[#F5F5F7]" : "bg-[#F5F5F7]/60 opacity-50"}`}>
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${path ? "bg-[#fff] text-[#0071E3] border border-black/[0.06]" : "bg-[#fff] text-[#C7C7CC] border border-black/[0.04]"}`}>
        {label.includes("PPT") ? <Presentation className="w-4 h-4" /> : label.includes("PDF") ? <FileText className="w-4 h-4" /> : <FileArchive className="w-4 h-4" />}
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-semibold text-[#1D1D1F] truncate">{label}</p>
        <p className="text-[11px] text-[#8E8E93]">{path ? "눌러서 내려받기" : "첨부 파일 없음"}</p>
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {path && onPreview && (
        <button onClick={onPreview} className="h-8 px-3 rounded-full bg-[#fff] text-[#0071E3] border border-black/[0.06] flex items-center gap-1 text-xs font-semibold hover:bg-[#0071E3]/5">
          <Eye className="w-3.5 h-3.5" /> 미리보기
        </button>
      )}
      {path && (
        <button onClick={onDownload} aria-label="내려받기" className="w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center hover:bg-[#0077ED]">
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

// ✨ [2026-09-30] 웹으로 작성한 계획서인지 — 개요/목표/로드맵 중 하나라도 있으면 웹 계획서
const isWebPlan = (r: any) =>
  (Number(r?.month) === 3 || Number(r?.month) === 9) &&
  Boolean((r?.planOverview && String(r.planOverview).trim()) || r?.planGoals?.length || r?.planRoadmapItems?.length);

// 커뮤니티에서 보는 계획서 내용 — 계획서 작성 화면과 같은 항목 순서
