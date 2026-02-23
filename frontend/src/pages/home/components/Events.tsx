import { motion } from "framer-motion";
import { Calendar, MapPin, Sparkles, ArrowRight, Eye, Heart } from "lucide-react"; // 💡 Heart 아이콘 추가

export const Events = ({ onNavigate, events }: { onNavigate: (page: string, id?: number) => void; events: any[] }) => {
  return (
    <section id="events" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm mb-4">
              <Sparkles size={16} /> Events
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">주요 행사 일정</h2>
          </div>
          <button 
            onClick={() => onNavigate("event-page")}
            className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group"
          >
            모든 일정 보기 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {events && events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onNavigate("event-detail", event.id)}
              className="group cursor-pointer"
            >
              <div className="relative h-64 rounded-[2.5rem] overflow-hidden mb-6 shadow-sm border border-slate-100">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-black uppercase shadow-lg">
                    {event.category}
                  </span>
                </div>
              </div>

              <div className="px-2">
                <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors leading-tight line-clamp-1">
                  {event.title}
                </h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                    <Calendar size={16} className="text-indigo-400" /> {event.date}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                    <MapPin size={16} className="text-pink-400" /> {event.location}
                  </div>
                </div>

                {/* 💡 카드 하단 조회수 및 좋아요 표시 영역 */}
                <div className="flex items-center justify-end pt-5 border-t border-slate-50 gap-4">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                    <Eye size={14} /> {event.views || 0}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                    <Heart size={14} /> {event.likes || 0}
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