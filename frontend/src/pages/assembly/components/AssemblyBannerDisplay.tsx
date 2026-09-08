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

  return (
    <div className="relative min-h-full w-full flex items-center justify-center p-5 overflow-hidden" style={{ background: "#f5f5f7" }}>
      <style>{`
        @keyframes assembly-blob-move { from { transform: translate(0,0) scale(1); } to { transform: translate(100px,50px) scale(1.1); } }
        @keyframes assembly-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .assembly-blob { animation: assembly-blob-move 20s infinite alternate ease-in-out; }
        .assembly-glass-card { animation: assembly-fade-in 0.6s ease-out forwards; opacity: 0; }
      `}</style>

      {/* 배경 블롭 */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{ filter: "blur(80px)", opacity: 0.6 }}>
        <div className="assembly-blob absolute rounded-full" style={{ width: 500, height: 500, background: "#ffdde1", top: "-10%", left: "-10%" }} />
        <div className="assembly-blob absolute rounded-full" style={{ width: 600, height: 600, background: "#ee9ca7", bottom: "-10%", right: "-10%", animationDuration: "25s" }} />
        <div className="assembly-blob absolute rounded-full" style={{ width: 400, height: 400, background: "#a1c4fd", top: "20%", right: "20%", animationDuration: "15s" }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(140px,auto)] gap-4 md:gap-5 w-full max-w-6xl">
        {/* 날씨 (세로로 김) */}
        <GlassCard delay={0.1} className="row-span-2 flex flex-col items-stretch justify-between text-left">
          <div>
            <CardTitle>광주 동구</CardTitle>
            <div className="flex items-center gap-2.5 my-2.5">
              <div className="text-4xl md:text-5xl font-bold">{weather.temp !== null ? `${weather.temp}°` : "--°"}</div>
              <div className="text-3xl">{weather.icon}</div>
            </div>
            <span className="block text-base md:text-lg font-medium">{weather.desc}</span>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-white/30 pt-3.5">
            {weather.hourly.map((h, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="text-xs md:text-sm text-slate-500 font-semibold flex items-center gap-2">
                  {h.hour}시 <span>{h.icon}</span>
                </div>
                <div className="text-sm md:text-base font-bold">{h.temp}°</div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 오늘 날짜 */}
        <GlassCard delay={0.2}>
          <CardTitle>오늘 날짜</CardTitle>
          <div className="text-3xl md:text-4xl font-bold">{dateText}</div>
          <span className="text-sm md:text-base font-medium">{dayText}</span>
        </GlassCard>

        {/* 메인 타이틀 (2x2) */}
        <GlassCard delay={0} className="col-span-2 row-span-2 p-8 md:p-12">
          <p className="text-indigo-600 font-bold text-xs md:text-sm uppercase tracking-[0.2em] mb-2">DEVSIGN</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        </GlassCard>

        {/* 공지사항 */}
        <GlassCard delay={0.35} className="items-start">
          <CardTitle>공지사항</CardTitle>
          {data.notices.length === 0 ? (
            <span className="text-xs md:text-sm text-slate-400 font-medium">등록된 공지가 없습니다</span>
          ) : (
            <div className="text-xs md:text-sm font-medium text-left w-full space-y-1">
              {data.notices.map((n, i) => <div key={i}>• {n}</div>)}
            </div>
          )}
        </GlassCard>

        {/* 오늘의 안건 (2x1) */}
        <GlassCard delay={0.4} className="col-span-2 items-start">
          <CardTitle>오늘의 안건</CardTitle>
          {data.agenda.length === 0 ? (
            <span className="text-xs md:text-sm text-slate-400 font-medium">등록된 안건이 없습니다</span>
          ) : (
            <ul className="w-full space-y-2">
              {data.agenda.map((a, i) => (
                <li key={i} className="flex items-center gap-3 font-medium text-sm md:text-base">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" /> {a}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* 참석 인원 */}
        <GlassCard delay={0.5}>
          <CardTitle>참석 인원</CardTitle>
          <div className="text-3xl md:text-4xl font-bold">{data.attendanceCount ?? "-"}</div>
          <span className="text-sm md:text-base font-medium">DEVSIGN Crew</span>
        </GlassCard>

        {/* 오늘의 한마디 */}
        <GlassCard delay={0.6}>
          <CardTitle>오늘의 한마디</CardTitle>
          <p className="text-sm md:text-base font-medium text-center normal-case tracking-normal text-indigo-500">
            {data.quote?.trim() ? `"${data.quote}"` : "-"}
          </p>
        </GlassCard>

        {/* 다음 일정 */}
        <GlassCard delay={0.7}>
          <CardTitle>다음 일정</CardTitle>
          <div className="text-lg md:text-2xl font-bold">{data.nextAssemblyLabel?.trim() || "미정"}</div>
          {data.nextAssemblyDate && (
            <span className="text-sm md:text-base font-medium">
              {data.nextAssemblyDate.replace(/-/g, ".")}{dDayText ? ` (${dDayText})` : ""}
            </span>
          )}
        </GlassCard>

        {/* 카운트다운 */}
        <GlassCard delay={0.8}>
          <CardTitle>종료까지 남은 시간</CardTitle>
          <div className="text-lg md:text-2xl font-extrabold tabular-nums">{countdownText}</div>
          <span className="text-sm md:text-base font-medium">목표: {String(targetH).padStart(2, "0")}시 {String(targetM).padStart(2, "0")}분</span>
        </GlassCard>

        {/* 현재 시간 (2x1) */}
        <GlassCard delay={0.9} className="col-span-2">
          <CardTitle className="self-center">현재 시간</CardTitle>
          <div className="text-4xl md:text-6xl font-extrabold tracking-tight tabular-nums">{clockText}</div>
        </GlassCard>
      </div>
    </div>
  );
};

const GlassCard = ({ children, delay, className = "" }: { children: React.ReactNode; delay: number; className?: string }) => (
  <div
    className={`assembly-glass-card rounded-3xl p-6 md:p-8 flex flex-col justify-center items-center text-center border border-white/50 shadow-sm ${className}`}
    style={{
      background: "rgba(255,255,255,0.4)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      animationDelay: `${delay}s`,
      color: "#1d1d1f",
    }}
  >
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 self-start ${className}`}>
    {children}
  </span>
);
