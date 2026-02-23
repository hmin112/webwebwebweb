import { motion } from "framer-motion";
import { MessageSquare, Eye, Heart, ArrowRight } from "lucide-react";

interface BoardSectionProps {
  onNavigate: (pageId: string, itemId?: any) => void;
  posts: any[];
}

export const Board = ({ onNavigate, posts }: BoardSectionProps) => {
  return (
    <div id="board" className="py-32 bg-slate-50 scroll-mt-20 px-6">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-indigo-600 font-bold text-sm mb-4 shadow-sm border border-slate-100"
            >
              <MessageSquare size={16} /> Board
            </motion.div>
            <h2 className="text-4xl font-[900] text-slate-900 tracking-tighter uppercase">게시판</h2>
          </div>
          <button 
            onClick={() => onNavigate("board-page")} 
            className="flex items-center gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group"
          >
            전체 보기 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => onNavigate("board-detail", post.id)} 
              className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer flex flex-col h-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  post.category === "회비" 
                    ? "bg-amber-50 text-amber-600 border border-amber-100" 
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                  {post.category || "일반"}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-indigo-600 line-clamp-1 tracking-tight transition-colors">
                {post.title}
              </h3>
              <p className="text-slate-400 font-bold text-sm mb-6 line-clamp-2 flex-1 leading-relaxed">
                {post.content}
              </p>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="text-slate-700 font-black text-xs">{post.author}</div>
                
                {/* ✨ 하단 스태츠 영역: 조회수, 댓글수, 좋아요수 */}
                <div className="flex items-center gap-3 text-slate-300 font-bold text-[11px]">
                  <div className="flex items-center gap-1 group-hover:text-slate-500 transition-colors">
                    <Eye size={14} /> {post.views || 0}
                  </div>
                  <div className="flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
                    <MessageSquare size={14} /> {post.comments?.length || post.commentCount || 0}
                  </div>
                  <div className="flex items-center gap-1 group-hover:text-rose-500 transition-colors">
                    <Heart 
                      size={14} 
                      className={(post.likes || 0) > 0 ? "fill-rose-500 text-rose-500" : ""} 
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