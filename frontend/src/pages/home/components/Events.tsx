import { ArrowRight } from "lucide-react";
import { ClubCalendar } from "../../../components/calendar/ClubCalendar";

// ✨ [2026-09-30] 주요 행사 → 캘린더로. 왼쪽 월 달력(날짜에 색 점, 누르면 그날 일정), 오른쪽 다가오는 일정(D-day).
// 로그인한 부원에게는 총회 제출 시작·마감일도 같이 보인다. 행사 사진 카드는 "모든 일정 보기"(행사 페이지)에서.
export const Events = ({ onNavigate, events, isLoggedIn }: { onNavigate: (page: string, id?: number) => void; events: any[]; isLoggedIn: boolean }) => {
  return (
    <section id="events" className="py-10 md:py-16 bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-row justify-between items-end mb-6 md:mb-8 gap-4 md:gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">주요 행사 · 일정</h2>
            <p className="text-sm md:text-base text-[#6E6E73] mt-2">날짜를 누르면 그날 일정을 볼 수 있어요.</p>
          </div>
          <button
            onClick={() => onNavigate("event-page")}
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-0 shrink-0"
          >
            모든 일정 보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <ClubCalendar events={events} isLoggedIn={isLoggedIn} onOpenEvent={(id) => onNavigate("event-detail", id)} />
      </div>
    </section>
  );
};
