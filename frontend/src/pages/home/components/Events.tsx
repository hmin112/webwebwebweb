import { motion } from "framer-motion";
import { Calendar, MapPin, Sparkles, ArrowRight, Eye, Heart } from "lucide-react"; // 💡 Heart 아이콘 추가

export const Events = ({ onNavigate, events }: { onNavigate: (page: string, id?: number) => void; events: any[] }) => {
  return (
    <section id="events" className="py-10 md:py-16 bg-[#F4F6FA]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* ✨ 상단 헤더 영역: 모바일에서도 전체보기 버튼이 우측 끝에 오도록 flex-row 고정 */}
        <div className="flex flex-row justify-between items-end mb-6 md:mb-8 gap-4 md:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs md:text-sm mb-3 md:mb-4">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" /> Events
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">주요 행사 일정</h2>
          </div>
          <button 
            onClick={() => onNavigate("event-page")}
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-0"
          >
            모든 일정 보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ✨ [2026-09-30] 이벤트 카드 — PC·모바일 모두 깔끔한 흰 카드. 예전엔 PC에서 배경 없는 카드로 짜여 있었는데
            전역 "흰 배경 = 유리" 규칙이 PC에서도 유리 박스를 씌워 여백 없는 상자에 사진·글자가 붙어 보였다.
            bg-white 대신 임의값(#fff)을 써서 전역 규칙에 걸리지 않게 하고 카드 모양을 직접 정한다. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {events && events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              onClick={() => onNavigate("event-detail", event.id)}
              className="group cursor-pointer bg-[#fff] rounded-[1.5rem] md:rounded-[1.75rem] overflow-hidden border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:shadow-[0_10px_30px_rgb(0_0_0/0.07)] hover:-translate-y-0.5 transition-all duration-300 flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0 p-3 md:p-0"
            >
              {/* 사진: 모바일은 왼쪽 정사각형, PC는 카드 위쪽을 꽉 채움 */}
              <div className="relative w-24 h-24 md:w-full md:h-auto md:aspect-[16/10] rounded-2xl md:rounded-none overflow-hidden shrink-0 bg-[#F2F2F7]">
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                {event.category && (
                  <span className="absolute top-2 left-2 md:top-4 md:left-4 px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-[#ffffff]/90 backdrop-blur text-[#1D1D1F] text-[9px] md:text-[11px] font-semibold shadow-[0_1px_3px_rgb(0_0_0/0.12)]">
                    {event.category}
                  </span>
                )}
              </div>

              {/* 글자 영역 */}
              <div className="flex flex-col flex-1 min-w-0 md:p-5 md:pt-4">
                <h3 className="text-[15px] md:text-lg font-bold tracking-[-0.01em] text-[#1D1D1F] mb-1.5 md:mb-2.5 group-hover:text-[#0071E3] transition-colors leading-snug line-clamp-1">
                  {event.title}
                </h3>
                <div className="flex flex-col gap-1 md:gap-1.5 text-[12px] md:text-[13px] text-[#6E6E73]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-[#8E8E93]" />
                    <span className="truncate">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-[#8E8E93]" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 md:mt-4 md:pt-3.5 md:border-t md:border-black/[0.05] text-[11px] text-[#AEAEB2] font-medium">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {event.views || 0}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {event.likes || 0}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};