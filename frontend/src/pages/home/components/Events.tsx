import { motion } from "framer-motion";
import { Calendar, MapPin, Sparkles, ArrowRight, Eye, Heart } from "lucide-react"; // 💡 Heart 아이콘 추가

export const Events = ({ onNavigate, events }: { onNavigate: (page: string, id?: number) => void; events: any[] }) => {
  return (
    <section id="events" className="py-10 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* ✨ 상단 헤더 영역: 모바일에서도 전체보기 버튼이 우측 끝에 오도록 flex-row 고정 */}
        <div className="flex flex-row justify-between items-end mb-8 md:mb-16 gap-4 md:gap-6">
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

        {/* 이벤트 카드 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {events && events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onNavigate("event-detail", event.id)}
              // ✨ 모바일: flex-row(가로형) 및 카드 배경/테두리 추가, 데스크탑: flex-col(세로형) 및 배경 제거(기존 디자인)
              className="group cursor-pointer bg-white md:bg-transparent p-4 md:p-0 rounded-[1.5rem] md:rounded-none shadow-sm md:shadow-none border border-slate-100 md:border-none hover:shadow-xl md:hover:shadow-none transition-all flex flex-row md:flex-col items-center md:items-stretch gap-4 md:gap-0"
            >
              
              {/* ✨ 이미지 영역: 모바일에서는 왼쪽의 작은 정사각형, 데스크탑에서는 윗쪽의 큰 직사각형 */}
              <div className="relative w-24 h-24 md:w-full md:h-64 rounded-2xl md:rounded-[2.5rem] overflow-hidden md:mb-6 shadow-sm border border-slate-100 shrink-0">
                <img 
                  src={event.image} 
                  alt={event.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                {/* 카테고리 태그 */}
                <div className="absolute top-2 left-2 md:top-6 md:left-6">
                  <span className="px-2 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-full bg-indigo-600 text-white text-[9px] md:text-[11px] font-black uppercase shadow-lg">
                    {event.category}
                  </span>
                </div>
              </div>

              {/* 텍스트 컨텐츠 영역 */}
              <div className="flex flex-col flex-1 min-w-0 md:px-2 justify-center h-full">
                
                {/* 제목 */}
                <h3 className="text-base md:text-2xl font-black text-slate-900 mb-1.5 md:mb-4 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
                  {event.title}
                </h3>
                
                {/* 날짜 및 장소 정보 */}
                <div className="flex flex-col gap-1 md:space-y-3 mb-2 md:mb-6">
                  <div className="flex items-center gap-1.5 md:gap-3 text-slate-500 font-medium text-xs md:text-sm">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400 shrink-0" /> 
                    <span className="truncate">{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 md:gap-3 text-slate-500 font-medium text-xs md:text-sm">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-pink-400 shrink-0" /> 
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                {/* 하단 조회수 및 좋아요 표시 영역 */}
                {/* ✨ 모바일 여백 축소 (pt-1), 데스크탑 유지 (md:pt-5) */}
                <div className="flex items-center justify-start md:justify-end pt-1 md:pt-5 border-t-0 md:border-t border-slate-50 gap-3 md:gap-4 mt-auto md:mt-0">
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-[11px]">
                    <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" /> {event.views || 0}
                  </div>
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-[11px]">
                    <Heart className="w-3 h-3 md:w-3.5 md:h-3.5" /> {event.likes || 0}
                  </div>
                </div>
                
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};