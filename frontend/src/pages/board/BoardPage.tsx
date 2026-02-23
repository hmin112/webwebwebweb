import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, Pencil, Eye, Heart, 
  ArrowLeft, Search, Hash, MessageCircle, Wallet 
} from "lucide-react";
import { Button } from "../../components/ui/button";

export const BoardPage = ({ onNavigate, posts, isLoggedIn }: any) => {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState(""); // 검색 기능 연동을 위한 상태
  const categories = ["전체", "회비", "자유", "질문"];

  // 카테고리 필터링 + 검색 필터링 로직
  const filteredPosts = posts
    .filter((p: any) => activeCategory === "전체" || p.category === activeCategory)
    .filter((p: any) => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ✨ 학번 포맷팅 함수 수정 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "";
    
    const strId = String(id).trim();

    // 1. 이미 '학번' 글자가 포함되어 있다면 그대로 반환
    if (strId.includes("학번")) return strId;

    // 2. 8자리 학번인 경우 (예: 20221234 -> 22학번)
    if (strId.length === 8) {
      return `${strId.substring(2, 4)}학번`;
    }

    // 3. 2자리인 경우 (예: 22 -> 22학번)
    if (strId.length === 2) {
      return `${strId}학번`;
    }

    // 4. 기타 케이스는 뒤에 '학번'만 붙여서 반환
    return `${strId}학번`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* 헤더 영역 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <button 
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2 text-slate-400 font-black mb-6 hover:text-indigo-600 transition-colors group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
              메인으로 돌아가기
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                <MessageCircle size={28} />
              </div>
              <h1 className="text-4xl font-[900] text-slate-900 tracking-tighter uppercase">
                게시판
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-3.5 bg-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 w-72 font-bold text-sm shadow-sm transition-all"
              />
            </div>
            <Button 
              onClick={() => {
                if (!isLoggedIn) {
                  alert("로그인이 필요한 서비스입니다.");
                  return;
                }
                onNavigate("board-write");
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-7 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <Pencil size={18} /> 글쓰기
            </Button>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black whitespace-nowrap transition-all text-sm ${
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                  : "bg-white text-slate-400 hover:bg-slate-100 border border-slate-100"
              }`}
            >
              {cat === "회비" ? (
                <Wallet size={14} className={activeCategory === cat ? "text-yellow-400" : "text-slate-300"} />
              ) : (
                <Hash size={14} className={activeCategory === cat ? "text-indigo-400" : "text-slate-300"} />
              )}
              {cat}
            </button>
          ))}
        </div>

        {/* 게시글 리스트 */}
        <div className="grid gap-4">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post: any) => (
              <motion.div
                key={post.id}
                whileHover={{ x: 10, backgroundColor: "white" }}
                onClick={() => onNavigate("board-detail", post.id)}
                className="bg-white/60 backdrop-blur-sm p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group transition-all hover:shadow-2xl hover:shadow-indigo-100/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      post.category === "회비" 
                        ? "bg-amber-50 text-amber-600 border-amber-100" 
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      {post.category}
                    </span>
                    <span className="text-slate-300 text-xs font-bold">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-[900] text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 tracking-tight">
                    {post.title}
                  </h3>
                  <p className="text-slate-400 font-bold text-sm line-clamp-1 leading-relaxed">
                    {post.content}
                  </p>
                </div>
                
                <div className="flex items-center gap-8 shrink-0 border-l border-slate-50 pl-8">
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-4">
                      {/* 프로필 정보: 이름과 학번 병기 */}
                      <div className="flex flex-col items-end mr-1">
                        <p className="text-sm font-black text-slate-700 leading-none mb-1">{post.author}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          {formatStudentId(post.studentId)}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-200 overflow-hidden shadow-inner">
                        {post.profileImage ? (
                          <img src={post.profileImage} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                          <span>{post.author[0]}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* ✨ 하단 스태츠 영역: 조회수, 댓글수, 좋아요수 */}
                    <div className="flex items-center gap-4 justify-end text-slate-400 transition-colors group-hover:text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Eye size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs font-black tracking-tighter">
                          {post.views?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs font-black tracking-tighter">
                          {post.comments?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Heart 
                          size={16} 
                          className={`${(post.likes || 0) > 0 ? "fill-rose-500 text-rose-500" : "text-slate-300 group-hover:text-rose-400"} transition-colors`} 
                        />
                        <span className={`text-xs font-black tracking-tighter ${(post.likes || 0) > 0 ? "text-rose-500" : ""}`}>
                          {post.likes?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-40 text-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-100">
              <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-black">해당 카테고리에 등록된 글이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
