import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Power, Cpu, Snowflake, Flame, LockOpen } from "lucide-react";

// ✨ [2026-09-30] 동아리 기수 — 2010년 창단이 1기. 해가 바뀌면 자동으로 올라간다 (2026년 = 17th).
const FOUNDED_YEAR = 2010;
const toOrdinal = (n: number) => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] || "th"}`;
};

// 도어락 기록 미리보기 — 화면에 보이는 동안 몇 초마다 새 기록이 위로 올라온다 (예시 데이터)
const DOOR_LOG_PEOPLE = [
  { name: "김유찬", tint: "#E8EBFF", ink: "#4F46E5" },
  { name: "최승원", tint: "#FFF3DC", ink: "#C27803" },
  { name: "김아현", tint: "#FFE8F0", ink: "#DB2777" },
];
type DoorLog = { id: number; person: (typeof DOOR_LOG_PEOPLE)[number]; at: Date };

const formatKoreanTime = (d: Date) => {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${String(h % 12 === 0 ? 12 : h % 12).padStart(2, "0")}:${m}`;
};

const DoorLockFeed = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const counter = useRef(3);
  const [logs, setLogs] = useState<DoorLog[]>(() => {
    const now = Date.now();
    return DOOR_LOG_PEOPLE.map((person, i) => ({ id: i, person, at: new Date(now - (i + 1) * 17 * 60000) }));
  });

  useEffect(() => {
    if (!inView) return;
    const timer = setInterval(() => {
      setLogs((prev) => {
        const id = counter.current++;
        // 맨 위 사람과 겹치지 않게 순서대로 돌려서, 화면의 세 줄이 항상 서로 다른 사람이 되게
        const topIndex = DOOR_LOG_PEOPLE.indexOf(prev[0].person);
        const person = DOOR_LOG_PEOPLE[(topIndex + DOOR_LOG_PEOPLE.length - 1) % DOOR_LOG_PEOPLE.length];
        return [{ id, person, at: new Date() }, ...prev].slice(0, 3);
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <div ref={ref} className="bg-[#fff] rounded-[1.5rem] md:rounded-[2rem] border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-4 md:p-6 min-h-[264px] md:min-h-[332px] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <span className="text-[12px] md:text-sm font-semibold text-[#1D1D1F]">도어락 기록</span>
        <span className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-[#34C759]">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-[#34C759] animate-ping opacity-60" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-[#34C759]" />
          </span>
          실시간
        </span>
      </div>
      {/* 목록 칸은 딱 세 줄 높이로 고정 — 새 기록이 들어오는 순간 사라지는 기록까지 네 줄이 되며 카드가 늘었다
          줄어들고, 같은 줄의 냉난방기 카드까지 출렁이던 문제. popLayout으로 사라지는 기록은 자리를 차지하지 않는다. */}
      <div className="relative h-[196px] md:h-[236px] flex flex-col gap-2 md:gap-2.5 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="flex items-center gap-3 h-[60px] md:h-[72px] px-3 md:px-4 rounded-2xl bg-[#F5F5F7] shrink-0"
            >
              <div
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-[12px] md:text-[13px] font-bold shrink-0"
                style={{ background: log.person.tint, color: log.person.ink }}
              >
                {log.person.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] md:text-[14px] text-[#1D1D1F] truncate">
                  <span className="font-semibold">{log.person.name}</span> 님이 문을 열었습니다
                </p>
                <p className="flex items-center gap-1 text-[10px] md:text-[11px] text-[#8E8E93] mt-0.5">
                  <LockOpen className="w-3 h-3 text-[#34C759]" /> 학번 인증 · 디스코드
                </p>
              </div>
              <span className="text-[10px] md:text-[11px] font-medium text-[#AEAEB2] shrink-0">
                {i === 0 && Date.now() - log.at.getTime() < 60000 ? "방금 전" : formatKoreanTime(log.at)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const About = () => {
  return (
    <div className="bg-[#fdfeff]">
      {/* 1. 기존 동아리 소개 섹션 */}
      <section id="about" className="py-16 md:py-24 overflow-hidden bg-[#FAFAFC]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          {/* ✨ [2026-09-30] 실제 동아리 사진으로 교체. PC에서는 두 칸을 같은 높이로 늘려(items-stretch)
              사진 높이가 오른쪽 글 영역과 정확히 같아지게 하고, 사진은 그 칸을 꽉 채우도록(object-cover) 잘라 보여준다.
              천장보다 사람들이 보이도록 아래쪽 기준으로 자른다. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-stretch gap-8 lg:gap-16">

            {/* 왼쪽: 이미지 영역 */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative w-full aspect-[4/3] lg:aspect-auto lg:h-full min-h-[240px] rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_rgb(0_0_0/0.06)] bg-[#E5E5EA]"
            >
              <img
                src="/images/about-members.jpg"
                alt="DEVSIGN 부원들이 강의실에 모여 함께 찍은 사진"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-[50%_78%] transition-transform duration-1000 hover:scale-[1.03]"
              />
            </motion.div>

            {/* 오른쪽: 텍스트 영역 */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full flex flex-col justify-center lg:py-2"
            >
              <span className="text-indigo-600 font-extrabold text-sm md:text-lg mb-2 md:mb-4 block tracking-wider">
                동아리 소개
              </span>
              
              <h2 className="text-2xl md:text-4xl font-[900] text-slate-900 mb-4 md:mb-8 leading-tight tracking-tight">
                개발자를 향해<br /> 
                <span className="text-indigo-600">모두 함께 성장하는</span><br />
                동아리입니다
              </h2>

              <div className="space-y-4 md:space-y-6 text-slate-600 text-[13px] md:text-[16px] leading-relaxed font-medium text-justify">
                <p>
                  2010년에 창단된 <span className="text-indigo-600 font-bold">DEVSIGN</span>은 조선대학교 IT융합대학을 대표하는 코딩 학술 동아리로, 지난 10여 년간 수많은 IT 인재를 배출하며 그 전통을 이어오고 있습니다. 저희는 프로그래밍의 근간이 되는 기술적 기초를 다지는 데 주력하며 학술적 역량을 쌓아가는 데 매진하고 있습니다.
                </p>
                <p>
                  단순한 학습에 그치지 않고, 매달 정기적인 프로젝트 발표회를 개최하여 개인의 성과를 공유합니다. 이러한 과정을 통해 부원들은 실전 감각을 갖춘 개발자로 거듭나고 있습니다.
                </p>
                <p>
                  현재 <span className="text-pink-500 font-bold">100여 명의 부원</span>이 활동 중인 DEVSIGN은 '함께하는 성장의 가치'를 최우선으로 합니다. 야유회와 회식 등 다채로운 친목 활동을 통해 긴밀한 유대감을 형성하고 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:gap-8 mt-8 md:mt-12 pt-6 md:pt-10 border-t border-slate-100">
                <div>
                  <div className="text-2xl md:text-4xl font-black text-indigo-600 mb-0.5 md:mb-1">60+</div>
                  <div className="text-slate-500 font-bold text-[11px] md:text-sm">활동 부원</div>
                </div>
                <div>
                  <div className="text-2xl md:text-4xl font-black text-pink-500 mb-0.5 md:mb-1">{toOrdinal(new Date().getFullYear() - FOUNDED_YEAR + 1)}</div>
                  <div className="text-slate-500 font-bold text-[11px] md:text-sm">동아리 기수</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. 스마트 시스템 소개 섹션 */}
      <section className="pt-4 pb-16 md:pt-8 md:pb-24 bg-[#FAFAFC] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="mb-8 md:mb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs md:text-sm mb-4 md:mb-6"
            >
              <Cpu className="w-4 h-4 md:w-5 md:h-5" /> IoT & Discord 프로젝트
            </motion.div>
            <h2 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 md:mb-6 leading-tight">
              손끝에서 시작되는<br />스마트 워크스페이스
            </h2>
            <p className="text-slate-500 font-medium text-sm md:text-lg max-w-2xl leading-relaxed">
              DEVSIGN은 직접 구축한 디스코드 봇 시스템을 통해 동아리방의 모든 환경을 관리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-stretch">
            
            {/* 💡 WINDEV: 냉난방 제어 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              className="bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-5 md:p-14 border border-slate-100 group transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-5 md:mb-12">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-lg border-2 border-white relative group-hover:scale-110 transition-transform">
                    <img src="/images/windev_profile.jpeg" alt="WINDEV" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-3 h-3 md:w-5 md:h-5 bg-green-500 border-2 md:border-4 border-slate-50 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2">
                      WINDEV
                    </h3>
                    <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-wider">냉난방기 제어 봇</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 font-bold text-[13px] md:text-lg mb-4 md:mb-10 leading-relaxed text-justify flex-1">
                언제 어디서나 디스코드로 동아리방 온도를 조절하세요. 외부에서도 냉난방기를 원격 제어하여 입실 전 최적의 환경을 조성할 수 있습니다.
              </p>

              {/* ✨ [2026-09-30] 냉난방기 제어 미리보기 — 흰 카드 + 옅은 회색 칸 + 애플 색 알약 버튼 */}
              <div className="bg-[#fff] rounded-[1.5rem] md:rounded-[2rem] border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-4 md:p-6 min-h-[264px] md:min-h-[332px] flex flex-col">
                <div className="flex items-center justify-between mb-3 md:mb-5">
                  <span className="text-[12px] md:text-sm font-semibold text-[#1D1D1F]">냉난방기 제어</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#34C759]/10 text-[#248A3D] text-[10px] md:text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> 연결됨
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:gap-3 flex-1">
                  <div className="rounded-2xl bg-[#F5F5F7] p-3.5 md:p-5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-[#0071E3]">
                      <Snowflake className="w-3.5 h-3.5" /> 냉방
                    </span>
                    <p className="text-[#1D1D1F] font-semibold text-base md:text-2xl tracking-tight mt-3">18° – 27°</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F5F7] p-3.5 md:p-5 flex flex-col justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] md:text-xs font-semibold text-[#FF9500]">
                      <Flame className="w-3.5 h-3.5" /> 난방
                    </span>
                    <p className="text-[#1D1D1F] font-semibold text-base md:text-2xl tracking-tight mt-3">23° – 30°</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 md:mt-5">
                  <span className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-[#0071E3] text-white text-[11px] md:text-xs font-semibold cursor-default">에어컨 켜기</span>
                  <span className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-[#FF9500] text-white text-[11px] md:text-xs font-semibold cursor-default">히터 켜기</span>
                  <span className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-[#E5E5EA] text-[#1D1D1F] text-[11px] md:text-xs font-semibold flex items-center gap-1.5 cursor-default">
                    <Power className="w-3 h-3" /> 전원 끄기
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 💡 크산테: 도어락 제어 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              className="bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-5 md:p-14 border border-slate-100 group transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-5 md:mb-12">
                <div className="flex items-center gap-3 md:gap-5">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-lg border-2 border-white relative group-hover:scale-110 transition-transform">
                    <img src="/images/ksante_profile.jpeg" alt="크산테" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-3 h-3 md:w-5 md:h-5 bg-green-500 border-2 md:border-4 border-slate-50 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-2">
                      크산테
                    </h3>
                    <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-wider">도어락 제어 봇</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 font-bold text-[13px] md:text-lg mb-4 md:mb-10 leading-relaxed text-justify flex-1">
                24시간 여러분들의 자유로운 학습을 지원합니다. 물리적인 열쇠 필요없이 디스코드를 사용해 학번을 인증하고 도어락을 제어하여 동아리방에 자유롭게 출입 가능합니다.
              </p>

              <DoorLockFeed />
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
};