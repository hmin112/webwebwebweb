import { motion } from "framer-motion";
import { Megaphone, Calendar, ArrowRight, Eye, Pin } from "lucide-react"; // 💡 Pin 아이콘 추가

interface NoticeProps {
  onNavigate: (page: string, id?: number) => void;
  notices: any[];
}

export const Notice = ({ onNavigate, notices }: NoticeProps) => {
  // ✨ 고정된 게시물(pinned)을 최우선으로 정렬하여 상위 3개만 추출 (섹션 최좌측 배치)
  const displayNotices = [...(notices || [])]
    .sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    })
    .slice(0, 3);

  return (
    <section id="notice" className="py-24 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-indigo-600 font-bold text-sm mb-4 shadow-sm border border-slate-100">
              <Megaphone size={16} /> Notice
            </motion.div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">최신 공지사항</h2>
          </div>
          <button onClick={() => onNavigate("notice-page")} className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group">
            전체 보기 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayNotices.map((item, index) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.1 }} 
              viewport={{ once: true }} 
              onClick={() => onNavigate("notice-detail", item.id)}
              className="group relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
            >
              {/* ✨ 우측 상단 고정 핀 표시 (고정된 게시물일 경우에만 노출) */}
              {item.pinned && (
                <div className="absolute top-8 right-8 text-indigo-500">
                  <Pin size={20} fill="currentColor" />
                </div>
              )}

              <div className={`inline-block px-4 py-1.5 rounded-full text-[11px] font-black mb-6 ${
                item.tag === "모집" ? "bg-indigo-50 text-indigo-600" : "bg-pink-50 text-pink-600"
              }`}>{item.tag}</div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-4 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">{item.title}</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 line-clamp-2">{item.content}</p>
              
              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                  <Calendar size={14} /> {item.date}
                </div>
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                  <Eye size={14} /> {item.views || 0}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};