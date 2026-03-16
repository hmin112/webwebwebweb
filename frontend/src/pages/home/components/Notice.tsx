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
    <section id="notice" className="py-10 md:py-16 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* ✨ 상단 헤더 영역: 모바일에서도 전체보기 버튼이 우측 끝에 오도록 flex-row 고정 */}
        <div className="flex flex-row justify-between items-end mb-8 md:mb-16 gap-4 md:gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white text-indigo-600 font-bold text-xs md:text-sm mb-3 md:mb-4 shadow-sm border border-slate-100"
            >
              <Megaphone size={16} className="w-4 h-4 md:w-5 md:h-5" /> Notice
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">최신 공지사항</h2>
          </div>
          <button 
            onClick={() => onNavigate("notice-page")} 
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-0"
          >
            전체 보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 공지사항 카드 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {displayNotices.map((item, index) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, y: 30 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.1 }} 
              viewport={{ once: true }} 
              onClick={() => onNavigate("notice-detail", item.id)}
              // ✨ 모바일 패딩 축소(p-5), 모서리 둥글기 조절(rounded-[1.5rem]), 세로 꽉 채우기(flex-col h-full)
              className="group relative bg-white p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 hover:-translate-y-1 md:hover:-translate-y-2 cursor-pointer flex flex-col h-full"
            >
              {/* ✨ 우측 상단 고정 핀 표시 (모바일에서는 위치 살짝 조정) */}
              {item.pinned && (
                <div className="absolute top-5 right-5 md:top-8 md:right-8 text-indigo-500">
                  <Pin className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
                </div>
              )}

              {/* 카테고리 태그 */}
              <div className={`self-start px-2.5 py-1 md:px-4 md:py-1.5 rounded-md md:rounded-full text-[10px] md:text-[11px] font-black mb-3 md:mb-6 ${
                item.tag === "모집" ? "bg-indigo-50 text-indigo-600" : "bg-pink-50 text-pink-600"
              }`}>
                {item.tag}
              </div>
              
              {/* 제목 (우측 핀 아이콘과 겹치지 않게 pr 속성 추가) */}
              <h3 className="text-base md:text-xl font-bold text-slate-900 mb-1.5 md:mb-4 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1 pr-6 md:pr-0">
                {item.title}
              </h3>
              
              {/* 내용 */}
              <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed mb-4 md:mb-8 line-clamp-2 flex-1">
                {item.content}
              </p>
              
              {/* 하단 날짜 및 조회수 */}
              <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-slate-50 mt-auto">
                <div className="flex items-center gap-1.5 md:gap-2 text-slate-400 text-[10px] md:text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {item.date}
                </div>
                <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-[11px]">
                  <Eye className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {item.views || 0}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};