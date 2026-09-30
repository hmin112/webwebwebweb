import { api } from "../../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Users2, Pencil, Check, Link as LinkIcon, Type, Trophy, CalendarDays, Pause, Play, ChevronLeft, ChevronRight, X
} from "lucide-react";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

// 금상/은상/동상은 실제 메달 색상으로, 그 외(대상 등)는 기본 앰버 색상으로 강조 — 히어로 배너에서는 채움 없이 테두리만
// ✨ [2026-09-30] 사진 위 상 배지는 금·은·동 구분 없이 흐린 유리 + 흰 테두리(award-glass, index.css)
const getAwardBadgeStyle = (_awardName?: string) => "award-glass";

interface HeroProps {
  isAdmin: boolean;
  hallOfFame?: any[];
  onNavigate?: (page: string, id?: number) => void;
}

export const Hero = ({ isAdmin, hallOfFame = [], onNavigate }: HeroProps) => {
  // 💡 기존 모집 문구 및 링크 상태 (로컬 스토리지 연동)
  const [recruitmentText, setRecruitmentText] = useState(() => localStorage.getItem("heroRecruitmentText") || "2026년 신입 부원 모집 중");
  const [applyLink, setApplyLink] = useState(() => localStorage.getItem("heroApplyLink") || "https://open.kakao.com/o/example");
  const [applyButtonText, setApplyButtonText] = useState(() => localStorage.getItem("heroApplyButtonText") || "지원하기");

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);

  // 🏆 명예의 전당 쇼케이스: 대회 날짜 최신순으로 정렬되어 들어온 목록을 순서대로 자동 전환 (조선대 홈페이지 메인 배너 참고 — 일시정지 가능)
  const [hofIndex, setHofIndex] = useState(0);
  const [isHofPaused, setIsHofPaused] = useState(false);

  useEffect(() => {
    setHofIndex(0);
  }, [hallOfFame.length]);

  // hofIndex를 의존성에 포함시켜서, 화살표/점 클릭으로 수동 전환할 때마다 "다음 자동 전환까지
  // 남은 4.5초"가 그 시점부터 다시 시작되도록 함 — 예전엔 수동으로 넘긴 직후에도 원래
  // 타이머가 그대로 살아있어서 곧바로 한 번 더 자동으로 넘어가버리는 문제가 있었음
  useEffect(() => {
    if (isHofPaused || hallOfFame.length < 2) return;
    const timer = setTimeout(() => {
      setHofIndex((prev) => (prev + 1) % hallOfFame.length);
    }, 4500);
    return () => clearTimeout(timer);
  }, [hallOfFame.length, isHofPaused, hofIndex]);

  const currentHofEntry = hallOfFame[hofIndex];
  const currentHofAwards = currentHofEntry?.awards?.length
    ? currentHofEntry.awards
    : currentHofEntry ? [{ awardName: currentHofEntry.awardName, participants: currentHofEntry.participants || [] }] : [];

  // 좌우 화살표로 수동 이동 — 자동 전환 인터벌은 건드리지 않고 인덱스만 바꿔줌(점 클릭과 동일)
  const goToPrevHof = () => setHofIndex((prev) => (prev - 1 + hallOfFame.length) % hallOfFame.length);
  const goToNextHof = () => setHofIndex((prev) => (prev + 1) % hallOfFame.length);

  // ✨ 1. 초기 데이터 로드 (백엔드 연동)
  useEffect(() => {
    const fetchHeroSettings = async () => {
      try {
        // ✨ 핵심 1: 브라우저가 옛날 데이터를 기억하지 못하도록 캐시 방지 파라미터(?_t=시간) 추가!
        const response = await api.get(`/admin/settings?_t=${new Date().getTime()}`);
        if (response.data) {
          setRecruitmentText(response.data.recruitmentText);
          setApplyLink(response.data.applyLink);
          // 기존에 저장된 값이 없는(백엔드 배포 전에 저장된) 경우를 대비해 기본값으로 보완
          const buttonText = response.data.applyButtonText || "지원하기";
          setApplyButtonText(buttonText);

          // 받아온 최신 데이터를 로컬 스토리지에도 안전하게 업데이트
          localStorage.setItem("heroRecruitmentText", response.data.recruitmentText);
          localStorage.setItem("heroApplyLink", response.data.applyLink);
          localStorage.setItem("heroApplyButtonText", buttonText);
        }
      } catch (error) {
        console.error("Hero 설정을 불러오는 데 실패했습니다.", error);
      }
    };
    fetchHeroSettings();
  }, []);

  // ✨ 2. 데이터 저장 로직 (백엔드 전송)
  const saveSettings = async (text: string, link: string, buttonText: string) => {
    // 로컬 스토리지 동기화
    localStorage.setItem("heroRecruitmentText", text);
    localStorage.setItem("heroApplyLink", link);
    localStorage.setItem("heroApplyButtonText", buttonText);

    if (isAdmin) {
      try {
        const response = await api.post("/admin/settings", {
          recruitmentText: text,
          applyLink: link,
          applyButtonText: buttonText
        });
        
        // ✨ 핵심 2: 백엔드가 진짜로 저장을 성공했는지 팝업으로 명확하게 알려주기!
        if (response.data && response.data.status === "success") {
          alert("메인 화면 설정이 서버에 완벽하게 저장되었습니다! ✅");
        } else {
          alert(`저장 실패: 백엔드 오류 (${response.data.message})`);
        }
      } catch (error) {
        console.error("백엔드 저장 실패", error);
        alert("서버 통신 오류로 인해 설정이 저장되지 않았습니다. 🚨");
      }
    }
  };

  const handleApply = () => {
    if (isEditingLink) return;
    window.open(applyLink, "_blank");
  };

  // ✨ [2026-09-30] 편집을 시작할 때 값을 기억해 두고, 취소(✕·Esc)하면 되돌린다
  const [textBackup, setTextBackup] = useState("");
  const [linkBackup, setLinkBackup] = useState({ text: "", link: "" });
  const startTextEdit = () => { setTextBackup(recruitmentText); setIsEditing(true); };
  const cancelTextEdit = () => { setRecruitmentText(textBackup); setIsEditing(false); };
  const startLinkEdit = () => { setLinkBackup({ text: applyButtonText, link: applyLink }); setIsEditingLink(true); };
  const cancelLinkEdit = () => { setApplyButtonText(linkBackup.text); setApplyLink(linkBackup.link); setIsEditingLink(false); };

  // 문구 수정 완료 핸들러
  const handleTextSubmit = () => {
    setIsEditing(false);
    saveSettings(recruitmentText, applyLink, applyButtonText);
  };

  // 지원하기 버튼(문구+링크) 수정 완료 핸들러
  const handleLinkSubmit = () => {
    setIsEditingLink(false);
    saveSettings(recruitmentText, applyLink, applyButtonText);
  };

  // ✨ [2026-09-08 수정] 기존 pb-4/md:pb-8이 배너 아래에 흰 배경만 있는 여백을 만들어서,
  // 바로 아래 지원 프로그램 신청 섹션(회색 배경)과 사이에 흰 띠가 끼어 있는 것처럼 보였음.
  // 아래쪽 패딩을 없애서 배너가 다음 섹션과 바로 붙도록 수정
  return (
    // ✨ [2026-09-29] 상단 바 높이(모바일 64px / 데스크탑 72px)와 딱 맞춰서 배너가 바로 붙게 — 예전엔 lg:pt-20(80px)이라
    // 8px 틈으로 예전 떠다니는 아이콘 배경이 비쳤다. 아이콘 배경과 뒤쪽 흐린 원도 제거.
    <section id="home" className="relative pt-16 lg:pt-[72px] overflow-hidden">
      

      {/* 🏆 명예의 전당 쇼케이스: 조선대 홈페이지 메인 배너 참고 — 화면 전체 폭 사진 위에 정보를 바로 얹고, 하단 중앙에 점 인디케이터 + 일시정지 버튼. 상단 여백 없이 navbar 바로 아래에 배치.
          모집 문구/지원 링크 줄도 같은 슬라이드 안에 넣어 흐린 사진 배경이 그 밑까지 자연스럽게 이어지도록 함 */}
      {/* ✨ [2026-09-08 수정] 기존 mb-6이 배너 아래에 24px짜리 흰 여백을 추가로 남겨서,
          아래쪽 패딩을 없앤 뒤에도 흰 띠가 조금 남아있었음 — 이 마진도 제거 */}
      <div className="relative z-10">
        {currentHofEntry ? (
          <div className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden bg-slate-900">
            {/* 슬라이드 전환: 바깥 박스가 항상 어두운 배경(bg-slate-900)을 유지하고 있어서, 교체 중 하얗게 비치치 않고 자연스럽게 넘어감 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHofEntry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="relative"
              >
                {/* 배경: 흐린 사진을 배너 + 하단 문구 줄 전체 높이로 확장해서 깐다 */}
                {currentHofEntry.image ? (
                  <img
                    src={currentHofEntry.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/85" />

                {/* 전경: 이 안의 콘텐츠(고정 높이 배너 + 자연스러운 높이의 문구 줄)가 슬라이드 전체 높이를 결정 */}
                <div className="relative">
                  {/* 상단: 실제 배너(사진 비율 유지 + 텍스트 오버레이 + 점/일시정지), 클릭 시 상세 이동 */}
                  <div
                    onClick={() => onNavigate && onNavigate("halloffame-detail", currentHofEntry.id)}
                    className="group cursor-pointer relative h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden"
                  >
                    {/* 사진: 비율은 그대로 유지(잘리지 않음) */}
                    {currentHofEntry.image ? (
                      <img
                        src={currentHofEntry.image}
                        alt={currentHofEntry.title}
                        className="absolute inset-0 w-full h-full object-contain object-[75%_center] scale-[1.18] transition-transform duration-700 group-hover:scale-[1.24]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Trophy className="w-16 h-16 text-amber-300/60" />
                      </div>
                    )}

                    {/* 텍스트 가독성을 위한 스크림 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* 정보: 사진 위에 바로 얹음 (좌측 정렬) */}
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full max-w-7xl mx-auto px-6 md:px-10">
                        <div className="max-w-xl text-left text-white">
                          <div className="mb-3 md:mb-4 flex flex-wrap gap-2">
                            {currentHofAwards.map((award: any) => <span key={award.awardName} className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-black ${getAwardBadgeStyle(award.awardName)}`}>{award.awardName}</span>)}
                          </div>
                          <div className="inline-flex items-center gap-1.5 text-amber-300 font-black text-xs md:text-sm mb-2 md:mb-3">
                            <Trophy className="w-4 h-4 md:w-5 md:h-5" /> Hall of Fame
                          </div>
                          <h3 className="text-2xl sm:text-3xl md:text-5xl font-black leading-snug line-clamp-2 break-keep mb-2 md:mb-3 drop-shadow-sm">
                            {currentHofEntry.title}
                          </h3>
                          <p className="text-white/70 font-bold text-sm md:text-lg line-clamp-1 break-keep mb-2 md:mb-3">{currentHofEntry.competitionName}</p>

                          {currentHofEntry.date && (
                            <div className="flex items-center gap-1.5 text-white/70 font-bold text-xs md:text-sm mb-4 md:mb-6">
                              <CalendarDays className="w-4 h-4 shrink-0" />
                              <span className="truncate">{currentHofEntry.date}</span>
                            </div>
                          )}

                          {currentHofAwards.flatMap((award: any) => award.participants || []).length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {currentHofAwards.flatMap((award: any) => award.participants || []).map((p: any) => (
                                <div key={p.loginId} className="hero-glass flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1">
                                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-white/20 shrink-0">
                                    {p.profileImage ? (
                                      <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-[8px]">
                                        {p.name?.[0] || "?"}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[11px] md:text-xs font-bold text-white whitespace-nowrap">
                                    {formatStudentId(p.studentId)} {p.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 하단 중앙: 점 인디케이터 + 일시정지 버튼 (조선대 메인 배너 참고) */}
                    {hallOfFame.length > 1 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute z-10 bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
                      >
                        <div className="flex items-center gap-1.5">
                          {hallOfFame.map((entry, i) => (
                            <button
                              key={entry.id}
                              onClick={() => setHofIndex(i)}
                              aria-label={`${i + 1}번째 수상 소식 보기`}
                              className={`h-1.5 rounded-full transition-all ${i === hofIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setIsHofPaused((prev) => !prev)}
                          aria-label={isHofPaused ? "자동 전환 재생" : "자동 전환 일시정지"}
                          className="hero-glass w-6 h-6 md:w-7 md:h-7 rounded-full text-white flex items-center justify-center"
                        >
                          {isHofPaused ? <Play className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 하단 문구/링크 줄 자리만큼 여백 확보 — 실제 내용은 전환과 무관하게 항상 고정된 아래 레이어에서 렌더링(깜빡이지 않도록) */}
                  <div className="h-[76px] md:h-16" />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 좌우 끝: 이전/다음 수동 이동 화살표 — 슬라이드 전환과 무관하게 항상 고정 표시(사진이 바뀌어도 안 사라짐).
                점 인디케이터/일시정지와 다르게 원형 배경 없이 화살표 아이콘만 노출.
                모바일에서는 텍스트 영역과 겹쳐 보이는 문제가 있어 탭 기능은 그대로 두되 아이콘만 투명 처리 */}
            {hallOfFame.length > 1 && (
              <div className="absolute z-10 top-0 left-0 right-0 h-[420px] sm:h-[480px] md:h-[560px] flex items-center justify-between px-2 md:px-4 pointer-events-none">
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrevHof(); }}
                  aria-label="이전 수상 소식"
                  className="pointer-events-auto p-2 md:p-3 opacity-0 md:opacity-100 text-white/80 hover:text-white transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                >
                  <ChevronLeft className="w-7 h-7 md:w-9 md:h-9" strokeWidth={2.5} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); goToNextHof(); }}
                  aria-label="다음 수상 소식"
                  className="pointer-events-auto p-2 md:p-3 opacity-0 md:opacity-100 text-white/80 hover:text-white transition-colors drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                >
                  <ChevronRight className="w-7 h-7 md:w-9 md:h-9" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* 모집 문구(중앙) / 지원 링크(우) — 슬라이드 전환과 무관하게 항상 고정 표시(깜빡이지 않음), 배너 사진의 흐린 배경 위에 그대로 얹힘 */}
            <div className="absolute z-10 bottom-0 left-0 right-0 h-[76px] md:h-16">
              <div className="w-full h-full max-w-7xl mx-auto px-6 md:px-10 flex flex-col items-center justify-center gap-1.5 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
                <div className="hidden md:block" />
                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  {isEditing ? (
                    // ✨ [2026-09-30] 사진 위에서도 잘 보이도록 어두운 유리 알약 입력칸 + 저장/취소 (전역 흰 유리 입력칸 규칙 대신 .hero-field)
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text" value={recruitmentText}
                        onChange={(e) => setRecruitmentText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); if (e.key === "Escape") cancelTextEdit(); }}
                        size={Math.max(12, Math.min(40, recruitmentText.length + 2))}
                        placeholder="가운데에 보일 문구"
                        className="hero-field h-9 md:h-10 px-4 rounded-full text-sm md:text-base font-semibold text-white outline-none max-w-[70vw]"
                        autoFocus
                      />
                      <button onClick={handleTextSubmit} aria-label="저장" className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#fff] text-[#1D1D1F] flex items-center justify-center hover:bg-white/90 shrink-0">
                        <Check className="w-4 h-4" strokeWidth={2.6} />
                      </button>
                      <button onClick={cancelTextEdit} aria-label="취소" className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/35 text-white border border-white/25 flex items-center justify-center hover:bg-black/50 shrink-0">
                        <X className="w-4 h-4" strokeWidth={2.4} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm md:text-base font-bold text-white">{recruitmentText}</span>
                      {isAdmin && (
                        <button onClick={startTextEdit} aria-label="문구 수정" className="text-white/40 hover:text-white transition-colors">
                          <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center md:justify-end gap-2 whitespace-nowrap">
                  <button
                    onClick={handleApply}
                    className="group inline-flex items-center gap-1.5 text-white hover:text-white/80 font-extrabold text-sm md:text-base transition-colors"
                  >
                    {applyButtonText} <ArrowRight className="w-4 h-4 md:w-[18px] md:h-[18px] group-hover:translate-x-1 transition-transform" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (isEditingLink) handleLinkSubmit();
                        else startLinkEdit();
                      }}
                      className={`transition-colors ${isEditingLink ? "text-white" : "text-white/40 hover:text-white"}`}
                    >
                      {isEditingLink ? <Check className="w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Pencil className="w-4 h-4 md:w-[18px] md:h-[18px]" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 명예의 전당 데이터를 아직 못 불러온 아주 짧은 순간(또는 등록된 게시물이 하나도
          // 없는 경우)에만 보이는 자리 — 예전에 여기 있던 고정 문구 대신, 실제 배너와 같은
          // 크기의 어두운 스켈레톤만 살짝 깜빡여서 "예전 문구가 잠깐 보였다 사라지는" 것처럼
          // 보이지 않게 함
          <div className="relative left-1/2 -translate-x-1/2 w-screen h-[496px] sm:h-[556px] md:h-[624px] bg-slate-900 animate-pulse" />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 지원 링크 편집 팝업 (관리자 전용) — 배너 바깥, 일반 배경 위 */}
        <AnimatePresence>
          {isEditingLink && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-md md:ml-auto bg-[#fff] rounded-3xl border border-black/[0.06] shadow-[0_12px_40px_rgb(0_0_0/0.10)] mt-4 mb-4 md:mb-8"
            >
              <div className="write-page rounded-3xl p-4 md:p-5">
              {/* ✨ [2026-09-30] 흰 카드 + 회색 입력칸(.write-page) — 전역 유리 규칙 때문에 흐릿하게 겹쳐 보이던 것 정리 */}
              <p className="text-[15px] font-bold text-[#1D1D1F] tracking-[-0.01em] mb-3">지원 버튼 수정</p>
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1.5 ml-1 flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> 버튼 문구</label>
              <input
                type="text"
                value={applyButtonText}
                onChange={(e) => setApplyButtonText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLinkSubmit(); if (e.key === "Escape") cancelLinkEdit(); }}
                placeholder="예: 지원하기"
                className="w-full h-11 px-4 rounded-xl text-sm font-semibold text-[#1D1D1F] outline-none mb-3"
                autoFocus
              />
              <label className="block text-xs font-semibold text-[#6E6E73] mb-1.5 ml-1 flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5" /> 링크</label>
              <input
                type="text"
                value={applyLink}
                onChange={(e) => setApplyLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLinkSubmit(); if (e.key === "Escape") cancelLinkEdit(); }}
                placeholder="카카오톡 오픈채팅 링크"
                className="w-full h-11 px-4 rounded-xl text-sm text-[#1D1D1F] outline-none"
              />
              <div className="flex gap-2 mt-4">
                <button onClick={cancelLinkEdit} className="flex-1 h-10 rounded-full bg-black/[0.05] text-sm font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">취소</button>
                <button onClick={handleLinkSubmit} className="flex-1 h-10 rounded-full bg-[#0071E3] text-white text-sm font-semibold hover:bg-[#0077ED] transition-colors">저장</button>
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
