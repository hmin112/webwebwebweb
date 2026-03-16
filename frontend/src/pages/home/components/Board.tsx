import { motion } from "framer-motion";
import { MessageSquare, Eye, Heart, ArrowRight, User, Wallet } from "lucide-react";

interface BoardSectionProps {
  onNavigate: (pageId: string, itemId?: any) => void;
  posts: any[];
}

export const Board = ({ onNavigate, posts }: BoardSectionProps) => {
  return (
    <div id="board" className="py-10 md:py-16 bg-slate-50 scroll-mt-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto px-2 md:px-6">
        
        {/* ✨ 상단 헤더 영역: 전체 보기 버튼이 항상 '게시판' 글씨 우측 끝에 오도록 flex-row 고정 */}
        <div className="flex flex-row justify-between items-end mb-8 md:mb-16 gap-4 md:gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white text-indigo-600 font-bold text-xs md:text-sm mb-3 md:mb-4 shadow-sm border border-slate-100"
            >
              <MessageSquare size={16} className="w-4 h-4 md:w-5 md:h-5" /> Board
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tighter uppercase">게시판</h2>
          </div>
          <button 
            onClick={() => onNavigate("board-page")} 
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-2"
          >
            전체 보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 게시글 카드 목록 */}
        {/* ✨ 모바일에서도 grid-cols-1 유지 (세로로 쌓임) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => onNavigate("board-detail", post.id)} 
              // ✨ 모바일 패딩 대폭 축소 (p-4), 데스크탑 유지 (md:p-8)
              className="group bg-white p-4 md:p-8 rounded-[1.25rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 md:hover:-translate-y-2 cursor-pointer flex flex-col h-full"
            >
              {/* 카테고리 태그 */}
              {/* ✨ 모바일 여백 축소 (mb-3), 데스크탑 유지 (md:mb-4) */}
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <span className={`px-2.5 py-1 md:px-3 md:py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                  post.category === "회비" 
                    ? "bg-amber-50 text-amber-600 border border-amber-100" 
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                  {post.category === "회비" && <Wallet size={10} className="inline mr-1 mb-0.5" />}
                  {post.category || "일반"}
                </span>
              </div>
              
              {/* 제목 */}
              <h3 className="text-base md:text-xl font-black text-slate-900 mb-1.5 md:mb-3 group-hover:text-indigo-600 line-clamp-1 tracking-tight transition-colors">
                {post.title}
              </h3>
              
              {/* 내용 */}
              <p className="text-slate-400 font-bold text-xs md:text-sm mb-4 md:mb-6 line-clamp-2 flex-1 leading-relaxed">
                {post.content}
              </p>

              {/* 하단 정보 영역 */}
              {/* ✨ 모바일 여백 축소 (pt-4), 데스크탑 유지 (md:pt-6) */}
              <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-slate-50 mt-auto">
                
                {/* ✨ 데스크탑/모바일 공통: 작성자 이름 왼쪽에 작은 프로필 사진 */}
                <div className="flex items-center gap-2 md:gap-2.5">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm shrink-0 flex items-center justify-center">
                    {post.profileImage ? (
                      <img 
                        src={post.profileImage} 
                        alt={post.author} 
                        className="w-full h-full object-cover" 
                        onError={(e: any) => {
                          e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                        <User size={12} className="md:w-[14px] md:h-[14px]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs font-black text-slate-700 truncate max-w-[80px] md:max-w-none">
                    {post.author}
                  </span>
                </div>
                
                {/* 하단 스태츠 영역: 조회수, 댓글수, 좋아요수 */}
                <div className="flex items-center gap-2.5 md:gap-3 text-slate-300 font-bold text-[10px] md:text-[11px] shrink-0">
                  <div className="flex items-center gap-1 group-hover:text-slate-500 transition-colors">
                    <Eye className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {post.views || 0}
                  </div>
                  <div className="flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {post.comments?.length || post.commentCount || 0}
                  </div>
                  <div className="flex items-center gap-1 group-hover:text-rose-500 transition-colors">
                    <Heart 
                      className={`w-3.5 h-3.5 md:w-[14px] md:h-[14px] ${(post.likes || 0) > 0 ? "fill-rose-500 text-rose-500" : ""}`} 
                    /> 
                    {post.likes || 0}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};