import { useEffect, useState } from "react";

// ✨ [2026-09-08 신규] "총회 배너" 실제 표시 화면 — WWDC 스타일 글래스모피즘 대시보드.
// /Users/homin/Desktop/devsign/5월 총회/5월 총회.html을 그대로 React/Tailwind로 이식.
// 날씨/시계/카운트다운/D-day처럼 "지금 시각" 기준으로 계산되는 값은 저장하지 않고
// 이 컴포넌트가 매번 화면에서 직접 계산한다 — 관리자가 입력한 텍스트/숫자만 props로 받음.

export interface AssemblyBannerData {
  year: number;
  month: number;
  title?: string | null;
  notices: string[];
  agenda: string[];
  attendanceCount?: number | null;
  quote?: string | null;
  targetEndTime?: string | null; // "HH:mm"
  nextAssemblyLabel?: string | null;
  nextAssemblyDate?: string | null; // "YYYY-MM-DD"
}

const WEATHER_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: "맑음", icon: "☀️" },
  1: { text: "대체로 맑음", icon: "🌤️" },
  2: { text: "구름 조금", icon: "⛅" },
  3: { text: "흐림", icon: "☁️" },
  45: { text: "안개", icon: "🌫️" },
  48: { text: "서리 안개", icon: "🌫️" },
  51: { text: "가벼운 이슬비", icon: "🌦️" },
  61: { text: "약한 비", icon: "🌧️" },
  63: { text: "비", icon: "🌧️" },
  71: { text: "약한 눈", icon: "🌨️" },
  95: { text: "뇌우", icon: "⛈️" },
};
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const AssemblyBannerDisplay = ({ data }: { data: AssemblyBannerData }) => {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number | null; desc: string; icon: string; hourly: { hour: number; temp: number; icon: string }[] }>({
    temp: null, desc: "불러오는 중", icon: "☁️", hourly: [],
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=35.15&longitude=126.92&current_weather=true&hourly=temperature_2m,weathercode&timezone=Asia%2FSeoul");
        const json = await res.json();
        if (cancelled) return;
        const temp = Math.round(json.current_weather.temperature);
        const code = json.current_weather.weathercode;
        const status = WEATHER_MAP[code] || { text: "흐림", icon: "☁️" };
        const currentHour = new Date().getHours();
        const hourly = [1, 2, 3, 4].map((i) => {
          const idx = currentHour + i;
          const hCode = json.hourly.weathercode[idx];
          return {
            hour: (currentHour + i) % 24,
            temp: Math.round(json.hourly.temperature_2m[idx]),
            icon: (WEATHER_MAP[hCode] || { icon: "☁️" }).icon,
          };
        });
        setWeather({ temp, desc: status.text, icon: status.icon, hourly });
      } catch (e) {
        if (!cancelled) setWeather((w) => ({ ...w, desc: "불러오기 실패" }));
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const month = data.month;
  const title = data.title?.trim() || `${month}월 총회`;

  const clockText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const dateText = `${now.getMonth() + 1}월 ${now.getDate()}일`;
  const dayText = `${DAYS[now.getDay()]}요일`;

  // 종료까지 남은 시간 (오늘 날짜 + 목표 시각 기준)
  const [targetH, targetM] = (data.targetEndTime && /^\d{1,2}:\d{2}$/.test(data.targetEndTime))
    ? data.targetEndTime.split(":").map(Number)
    : [20, 0];
  const targetTime = new Date(now);
  targetTime.setHours(targetH, targetM, 0, 0);
  const diffMs = targetTime.getTime() - now.getTime();
  const countdownText = diffMs < 0
    ? "종료됨"
    : `${String(Math.floor(diffMs / 3600000)).padStart(2, "0")}:${String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0")}`;

  // 다음 총회 D-day
  let dDayText = "";
  if (data.nextAssemblyDate) {
    const target = new Date(data.nextAssemblyDate + "T00:00:00");
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    dDayText = diffDays > 0 ? `D-${diffDays}` : diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`;
  }

  // ✨ 배경색을 여기서 칠하지 않는다 — 이 div는 position이 없는 일반 흐름 박스라, 칠하면
  // z-index:-10인 배경 블롭(아래)보다 페인트 순서상 나중(위)에 그려져서 블롭을 완전히 덮어버림.
  // 배경색은 이 컴포넌트를 감싸는 전체화면 래퍼(bg-[#f5f5f7])가 이미 칠해주고 있음
  return (
    <div className="relative h-screen w-screen flex items-center justify-center p-6 lg:p-10 overflow-hidden">
      <style>{`
        @keyframes assembly-blob-move { from { transform: translate(0,0) scale(1); } to { transform: translate(120px,60px) scale(1.15); } }
        @keyframes assembly-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .assembly-blob { animation: assembly-blob-move 20s infinite alternate ease-in-out; }
        .assembly-glass-card { animation: assembly-fade-in 0.6s ease-out forwards; opacity: 0; }
      `}</style>

      {/* 배경 블롭 — 리퀴드 글라스 느낌의 색감 소스. 카드들이 이 위에 반투명하게 얹혀서 서로 구분돼 보임 */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{ filter: "blur(90px)", opacity: 0.85 }}>
        <div className="assembly-blob absolute rounded-full" style={{ width: "42vw", height: "42vw", background: "#ffb3c0", top: "-14%", left: "-12%" }} />
        <div className="assembly-blob absolute rounded-full" style={{ width: "46vw", height: "46vw", background: "#e0729a", bottom: "-16%", right: "-12%", animationDuration: "25s" }} />
        <div className="assembly-blob absolute rounded-full" style={{ width: "34vw", height: "34vw", background: "#7fb2ff", top: "18%", right: "14%", animationDuration: "15s" }} />
        <div className="assembly-blob absolute rounded-full" style={{ width: "28vw", height: "28vw", background: "#ffe08a", bottom: "10%", left: "18%", animationDuration: "18s" }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(160px,1fr)] gap-4 lg:gap-6 w-full h-full max-w-[1800px]">
        {/* 날씨 (세로로 김) */}
        <GlassCard delay={0.1} className="row-span-2 flex flex-col items-stretch justify-between text-left">
          <div>
            <CardTitle>광주 동구</CardTitle>
            <div className="flex items-center gap-3 my-3">
              <div className="text-5xl lg:text-6xl font-bold">{weather.temp !== null ? `${weather.temp}°` : "--°"}</div>
              <div className="text-4xl">{weather.icon}</div>
            </div>
            <span className="block text-lg lg:text-xl font-medium">{weather.desc}</span>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/40 pt-4">
            {weather.hourly.map((h, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="text-sm lg:text-base text-slate-500 font-semibold flex items-center gap-2">
                  {h.hour}시 <span>{h.icon}</span>
                </div>
                <div className="text-base lg:text-lg font-bold">{h.temp}°</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 오늘 날짜 */}
        <GlassCard delay={0.2}>
          <CardTitle>오늘 날짜</CardTitle>
          <div className="text-4xl lg:text-5xl font-bold">{dateText}</div>
          <span className="text-lg lg:text-xl font-medium">{dayText}</span>
        </GlassCard>

        {/* 메인 타이틀 (2x2) */}
        <GlassCard delay={0} className="col-span-2 row-span-2 p-10 lg:p-14">
          <p className="text-indigo-600 font-bold text-sm lg:text-base uppercase tracking-[0.2em] mb-3">DEVSIGN</p>
          <h1 className="text-5xl lg:text-7xl xl:text-8xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        </GlassCard>

        {/* 공지사항 */}
        <GlassCard delay={0.35} className="items-start">
          <CardTitle>공지사항</CardTitle>
          {data.notices.length === 0 ? (
            <span className="text-sm lg:text-base text-slate-400 font-medium">등록된 공지가 없습니다</span>
          ) : (
            <div className="text-sm lg:text-base font-medium text-left w-full space-y-1.5">
              {data.notices.map((n, i) => <div key={i}>• {n}</div>)}
            </div>
          )}
        </GlassCard>

        {/* 오늘의 안건 (2x1) */}
        <GlassCard delay={0.4} className="col-span-2 items-start">
          <CardTitle>오늘의 안건</CardTitle>
          {data.agenda.length === 0 ? (
            <span className="text-sm lg:text-base text-slate-400 font-medium">등록된 안건이 없습니다</span>
          ) : (
            <ul className="w-full space-y-2.5">
              {data.agenda.map((a, i) => (
                <li key={i} className="flex items-center gap-3 font-medium text-base lg:text-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" /> {a}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* 참석 인원 */}
        <GlassCard delay={0.5}>
          <CardTitle>참석 인원</CardTitle>
          <div className="text-4xl lg:text-5xl font-bold">{data.attendanceCount ?? "-"}</div>
          <span className="text-lg lg:text-xl font-medium">DEVSIGN Crew</span>
        </GlassCard>

        {/* 오늘의 한마디 */}
        <GlassCard delay={0.6}>
          <CardTitle>오늘의 한마디</CardTitle>
          <p className="text-base lg:text-lg font-medium text-center normal-case tracking-normal text-indigo-500">
            {data.quote?.trim() ? `"${data.quote}"` : "-"}
          </p>
        </GlassCard>

        {/* 다음 일정 */}
        <GlassCard delay={0.7}>
          <CardTitle>다음 일정</CardTitle>
          <div className="text-2xl lg:text-3xl font-bold">{data.nextAssemblyLabel?.trim() || "미정"}</div>
          {data.nextAssemblyDate && (
            <span className="text-base lg:text-lg font-medium">
              {data.nextAssemblyDate.replace(/-/g, ".")}{dDayText ? ` (${dDayText})` : ""}
            </span>
          )}
        </GlassCard>

        {/* 카운트다운 */}
        <GlassCard delay={0.8}>
          <CardTitle>종료까지 남은 시간</CardTitle>
          <div className="text-2xl lg:text-3xl font-extrabold tabular-nums">{countdownText}</div>
          <span className="text-base lg:text-lg font-medium">목표: {String(targetH).padStart(2, "0")}시 {String(targetM).padStart(2, "0")}분</span>
        </GlassCard>

        {/* 현재 시간 (2x1) */}
        <GlassCard delay={0.9} className="col-span-2">
          <CardTitle className="self-center">현재 시간</CardTitle>
          <div className="text-5xl lg:text-7xl font-extrabold tracking-tight tabular-nums">{clockText}</div>
        </GlassCard>
      </div>
    </div>
  );
};

const GlassCard = ({ children, delay, className = "" }: { children: React.ReactNode; delay: number; className?: string }) => (
  <div
    className={`assembly-glass-card rounded-3xl p-7 lg:p-9 flex flex-col justify-center items-center text-center border ${className}`}
    style={{
      background: "rgba(255,255,255,0.55)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderColor: "rgba(255,255,255,0.8)",
      boxShadow: "0 20px 40px -12px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
      animationDelay: `${delay}s`,
      color: "#1d1d1f",
    }}
  >
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs lg:text-sm font-bold uppercase tracking-wider text-slate-500 mb-2.5 self-start ${className}`}>
    {children}
  </span>
);
