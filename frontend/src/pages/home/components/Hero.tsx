import { api } from "../../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Code2, Sparkles, Users2, Pencil, Check, Link as LinkIcon, Type,
  Cpu, Database, Globe, Terminal, Boxes,
  Layers, Monitor, Smartphone, Zap, Braces,
  Trophy, CalendarDays, Pause, Play
} from "lucide-react";
import { Button } from "../../../components/ui/button";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

// 금상/은상/동상은 실제 메달 색상으로, 그 외(대상 등)는 기본 앰버 색상으로 강조
const getAwardBadgeStyle = (awardName?: string) => {
  const name = awardName || "";
  if (name.includes("금")) return "bg-gradient-to-br from-[#FFDD66] to-[#B8860B] text-white shadow-lg shadow-amber-300/50";
  if (name.includes("은")) return "bg-gradient-to-br from-[#F4F4F5] to-[#9CA3AF] text-slate-900 shadow-lg shadow-slate-300/50";
  if (name.includes("동")) return "bg-gradient-to-br from-[#E0985A] to-[#8B5A2B] text-white shadow-lg shadow-orange-300/50";
  return "bg-amber-500 text-white shadow-lg";
};

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

  useEffect(() => {
    if (isHofPaused || hallOfFame.length < 2) return;
    const timer = setInterval(() => {
      setHofIndex((prev) => (prev + 1) % hallOfFame.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [hallOfFame.length, isHofPaused]);

  const currentHofEntry = hallOfFame[hofIndex];

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

  // 💡 배경 플로팅 아이콘 (원본 보존)
  const floatingIcons = [
    { icon: <Code2 size={48} />, top: "12%", left: "8%", delay: 0 },
    { icon: <Cpu size={64} />, top: "55%", left: "88%", delay: 2 },
    { icon: <Database size={40} />, top: "75%", left: "15%", delay: 4 },
    { icon: <Globe size={56} />, top: "22%", left: "80%", delay: 1 },
    { icon: <Terminal size={32} />, top: "8%", left: "45%", delay: 3 },
    { icon: <Boxes size={48} />, top: "68%", left: "4%", delay: 5 },
    { icon: <Sparkles size={32} />, top: "35%", left: "92%", delay: 1.5 },
    { icon: <Layers size={42} />, top: "85%", left: "40%", delay: 2.5 },
    { icon: <Zap size={36} />, top: "45%", left: "12%", delay: 0.5 },
    { icon: <Braces size={52} />, top: "18%", left: "25%", delay: 4.5 },
    { icon: <Monitor size={44} />, top: "78%", left: "70%", delay: 3.5 },
    { icon: <Smartphone size={38} />, top: "40%", left: "78%", delay: 2.2 },
  ];

  const handleApply = () => {
    if (isEditingLink) return;
    window.open(applyLink, "_blank");
  };

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

  return (
    <section id="home" className="relative pt-16 lg:pt-20 pb-4 md:pb-8 overflow-hidden bg-gradient-to-b from-[#f8faff] to-white">
      
      {/* 배경 플로팅 아이콘 레이어 (원본 보존) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map((item, index) => (
          <motion.div
            key={index}
            className="absolute text-indigo-300/50"
            style={{ top: item.top, left: item.left }}
            animate={{
              y: [0, -40, 0], 
              x: [0, 20, 0], 
              rotate: [0, 15, 0], 
              opacity: [0.4, 0.7, 0.4] 
            }}
            transition={{
              duration: 10 + index,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>

      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ✨ 모집 문구 영역: 다시 상단으로. navbar 바로 아래라 여백은 최소로 */}
        <div className="flex justify-center mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-5 md:py-2 rounded-full bg-white border border-indigo-100 shadow-sm shadow-indigo-100/30"
          >
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500 animate-pulse" />
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={recruitmentText}
                  onChange={(e) => setRecruitmentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                  className="text-xs md:text-sm font-bold text-indigo-600 outline-none border-b border-indigo-200 bg-transparent w-auto"
                  autoFocus
                />
                <button onClick={handleTextSubmit} className="text-green-500 hover:text-green-600">
                  <Check className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-bold text-indigo-600">{recruitmentText}</span>
                {isAdmin && (
                  <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                    <Pencil className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* 🏆 명예의 전당 쇼케이스: 조선대 홈페이지 메인 배너 참고 — 화면 전체 폭 사진 위에 정보를 바로 얹고, 하단 중앙에 점 인디케이터 + 일시정지 버튼 */}
      <div className="relative z-10 mb-10">
        {currentHofEntry ? (
          <div className="relative left-1/2 -translate-x-1/2 w-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentHofEntry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                onClick={() => onNavigate && onNavigate("halloffame-detail", currentHofEntry.id)}
                className="group cursor-pointer relative w-full h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden bg-slate-900"
              >
                {/* 사진: 비율은 그대로 유지(잘리지 않음), 남는 공간은 같은 사진을 흐리게 확대해 깐 배경으로 자연스럽게 채움 */}
                {currentHofEntry.image ? (
                  <>
                    <img
                      src={currentHofEntry.image}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                    />
                    <img
                      src={currentHofEntry.image}
                      alt={currentHofEntry.title}
                      className="absolute inset-0 w-full h-full object-contain object-[65%_center] transition-transform duration-700 group-hover:scale-105"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-amber-50 flex items-center justify-center">
                    <Trophy className="w-16 h-16 text-amber-200" />
                  </div>
                )}

                {/* 텍스트 가독성을 위한 스크림 */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* 정보: 사진 위에 바로 얹음 (좌측 정렬) */}
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full max-w-7xl mx-auto px-6 md:px-10">
                    <div className="max-w-xl text-left text-white">
                      <div className="mb-3 md:mb-4">
                        <span className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-black ${getAwardBadgeStyle(currentHofEntry.awardName)}`}>
                          {currentHofEntry.awardName}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-amber-300 font-black text-xs md:text-sm mb-2 md:mb-3">
                        <Trophy className="w-4 h-4 md:w-5 md:h-5" /> Hall of Fame
                      </div>
                      <h3 className="text-2xl sm:text-3xl md:text-5xl font-black leading-snug line-clamp-2 mb-2 md:mb-3 drop-shadow-sm">
                        {currentHofEntry.title}
                      </h3>
                      <p className="text-white/70 font-bold text-sm md:text-lg line-clamp-1 mb-2 md:mb-3">{currentHofEntry.competitionName}</p>

                      {currentHofEntry.date && (
                        <div className="flex items-center gap-1.5 text-white/70 font-bold text-xs md:text-sm mb-4 md:mb-6">
                          <CalendarDays className="w-4 h-4 shrink-0" />
                          <span className="truncate">{currentHofEntry.date}</span>
                        </div>
                      )}

                      {currentHofEntry.participants && currentHofEntry.participants.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {currentHofEntry.participants.slice(0, 6).map((p: any) => (
                            <div key={p.loginId} className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full pl-1 pr-2.5 py-1 border border-white/20">
                              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                                {p.profileImage ? (
                                  <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-[8px]">
                                    {p.name?.[0] || "?"}
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] md:text-xs font-bold text-white whitespace-nowrap">
                                {formatStudentId(p.studentId)} {p.name}
                              </span>
                            </div>
                          ))}
                          {currentHofEntry.participants.length > 6 && (
                            <span className="text-[11px] md:text-xs font-bold text-white/70">+{currentHofEntry.participants.length - 6}명</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 하단 중앙: 점 인디케이터 + 일시정지 버튼 (조선대 메인 배너 참고) */}
                {hallOfFame.length > 1 && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-5 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
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
                      className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center hover:bg-white/25 transition-colors"
                    >
                      {isHofPaused ? <Play className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <Pause className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-[72px] font-[900] tracking-wide text-slate-900 leading-[1.3] md:leading-[1.15]"
            >
              <span className="text-indigo-600 font-[900]">누구나 시작</span>하고,<br />
              <span className="text-pink-500 font-[900]">모두가 성장</span>하는 동아리
            </motion.h1>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">

        {/* 💡 ✨ 버튼 및 링크 편집 영역: 모바일에서 버튼 크기(px-6 py-4), 연필 아이콘 축소 */}
        <div className="flex flex-col items-center gap-4 md:gap-6 mb-4 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <Button 
              onClick={handleApply}
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 md:px-10 md:py-7 rounded-xl md:rounded-2xl font-extrabold text-sm md:text-lg group shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
            >
              {applyButtonText} <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {isAdmin && (
              <button 
                onClick={() => {
                  if (isEditingLink) handleLinkSubmit();
                  else setIsEditingLink(true);
                }}
                className={`p-3 md:p-4 rounded-xl border transition-all ${isEditingLink ? "bg-indigo-600 text-white border-indigo-600 shadow-lg" : "bg-white text-slate-300 border-slate-100 hover:text-indigo-600 shadow-sm"}`}
              >
                {isEditingLink ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Pencil className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            )}
          </div>

          <AnimatePresence>
            {isEditingLink && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full max-w-[280px] md:max-w-md bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-100/20 flex flex-col gap-2.5 md:gap-3"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <Type className="text-indigo-500 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <input
                    type="text"
                    value={applyButtonText}
                    onChange={(e) => setApplyButtonText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                    placeholder="버튼 문구 입력 (예: 지원하기)"
                    className="flex-1 text-xs md:text-sm font-bold text-slate-600 outline-none placeholder:text-slate-300"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <LinkIcon className="text-indigo-500 w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <input
                    type="text"
                    value={applyLink}
                    onChange={(e) => setApplyLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                    placeholder="카카오톡 오픈채팅 링크 입력"
                    className="flex-1 text-xs md:text-sm font-bold text-slate-600 outline-none placeholder:text-slate-300"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};