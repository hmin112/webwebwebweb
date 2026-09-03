import { useState } from "react";
import { motion } from "framer-motion";
import { 
  MessageSquare, Pencil, Eye, Heart, 
  ArrowLeft, Search, Hash, MessageCircle, Wallet,
  ChevronLeft, ChevronRight // ✨ 페이지 이동 화살표 아이콘 추가
} from "lucide-react";
import { Button } from "../../components/ui/button";

export const BoardPage = ({ onNavigate, posts, isLoggedIn }: any) => {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  
  // ✨ 페이지네이션용 상태 추가
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10; // ✨ 20개에서 10개로 수정됨

  // ✨ 회비 게시글은 로그인해야만 노출되므로(백엔드에서도 필터링됨), 비로그인 상태에서는
  // 카테고리 탭 자체를 숨겨 "숨겨진 카테고리가 있다"는 티도 나지 않게 한다.
  const categories = isLoggedIn ? ["전체", "회비", "자유", "질문"] : ["전체", "자유", "질문"];

  // 기존 검색/필터링 로직 유지
  const filteredPosts = posts
    .filter((p: any) => activeCategory === "전체" || p.category === activeCategory)
    .filter((p: any) => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.author.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // ✨ 현재 페이지에 해당하는 10개의 데이터만 잘라내기
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const currentPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage, 
    currentPage * postsPerPage
  );

  const formatStudentId = (id: string) => {
    if (!id) return "";
    
    const strId = String(id).trim();

    if (strId.includes("학번")) return strId;

    if (strId.length === 8) {
      return `${strId.substring(2, 4)}학번`;
    }

    if (strId.length === 2) {
      return `${strId}학번`;
    }

    return `${strId}학번`;
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 md:pt-32 pb-16 md:pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div>
            <button 
              onClick={() => onNavigate("home")}
              className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-black mb-4 md:mb-6 hover:text-indigo-600 transition-colors group text-xs md:text-base"
            >
              <ArrowLeft className="w-4 h-4 md:w-[18px] md:h-[18px] group-hover:-translate-x-1 transition-transform" /> 
              메인으로 돌아가기
            </button>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
                <MessageCircle className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <h1 className="text-2xl md:text-4xl font-[900] text-slate-900 tracking-tighter uppercase truncate">
                게시판
              </h1>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 md:gap-4 w-full md:w-auto mt-2 md:mt-0">
            <div className="relative hidden sm:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-[18px] h-[18px]" />
              <input 
                type="text" 
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // ✨ 검색할 때 무조건 1페이지로 돌아가도록 설정
                }}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 md:px-8 md:py-3.5 rounded-xl md:rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-1.5 md:gap-2 text-[11px] md:text-base h-auto shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> 글쓰기
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-8 md:mb-10 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setCurrentPage(1); // ✨ 카테고리 바꿀 때 무조건 1페이지로 돌아가도록 설정
              }}
              className={`flex items-center gap-1.5 md:gap-2 px-4 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl font-black whitespace-nowrap transition-all text-[11px] md:text-sm shrink-0 ${
                activeCategory === cat 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                  : "bg-white text-slate-400 hover:bg-slate-100 border border-slate-100"
              }`}
            >
              {cat === "회비" ? (
                <Wallet className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeCategory === cat ? "text-yellow-400" : "text-slate-300"}`} />
              ) : (
                <Hash className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeCategory === cat ? "text-indigo-400" : "text-slate-300"}`} />
              )}
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:gap-4">
          {/* ✨ filteredPosts 대신 잘라낸 currentPosts를 맵핑합니다 */}
          {currentPosts.length > 0 ? (
            currentPosts.map((post: any) => (
              <motion.div
                key={post.id}
                whileHover={{ x: 10, backgroundColor: "white" }}
                onClick={() => onNavigate("board-detail", post.id)}
                className="bg-white/60 backdrop-blur-sm p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 cursor-pointer group transition-all hover:shadow-2xl hover:shadow-indigo-100/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                    <span className={`px-2.5 py-1 md:px-4 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                      post.category === "회비" 
                        ? "bg-amber-50 text-amber-600 border-amber-100" 
                        : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                    }`}>
                      {post.category}
                    </span>
                    <span className="text-slate-300 text-[10px] md:text-xs font-bold truncate">{post.date}</span>
                  </div>
                  <h3 className="text-[15px] md:text-xl font-[900] text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5 md:mb-2 tracking-tight truncate md:whitespace-normal md:line-clamp-1">
                    {post.title}
                  </h3>
                  {post.category === "회비" && post.feeAmount ? (
                    <p className="text-amber-700 font-black text-xs md:text-sm line-clamp-1 md:leading-relaxed">
                      {post.feeAmount}
                      {post.feeDeadline && <span className="text-amber-400 font-bold"> · {post.feeDeadline}까지</span>}
                    </p>
                  ) : (
                    <p className="text-slate-400 font-bold text-xs md:text-sm line-clamp-1 md:leading-relaxed">
                      {post.content}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-row-reverse md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-50 pl-0 md:pl-8 pt-3 md:pt-0 mt-1 md:mt-0 gap-0 md:gap-8">
                  <div className="flex items-center gap-2 justify-end mb-0 md:mb-4">
                    <div className="flex flex-col items-end mr-0.5 md:mr-1">
                      <p className="text-xs md:text-sm font-black text-slate-700 leading-none mb-1">{post.author}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        {formatStudentId(post.studentId)}
                      </p>
                    </div>
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 font-black text-[10px] md:text-xs border border-slate-200 overflow-hidden shadow-inner shrink-0">
                      {post.profileImage ? (
                        <img
                          src={post.profileImage}
                          alt="profile"
                          className="w-full h-full object-cover"
                          onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                        />
                      ) : (
                        <span>{post.author[0]}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 md:gap-4 justify-start md:justify-end text-slate-400 transition-colors group-hover:text-slate-600">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[10px] md:text-xs font-black tracking-tighter">
                        {post.views?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[10px] md:text-xs font-black tracking-tighter">
                        {(post.commentCount || post.commentsList?.length || post.comments?.length || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <Heart 
                        className={`w-3.5 h-3.5 md:w-4 md:h-4 ${(post.likes || 0) > 0 ? "fill-rose-500 text-rose-500" : "text-slate-300 group-hover:text-rose-400"} transition-colors`} 
                      />
                      <span className={`text-[10px] md:text-xs font-black tracking-tighter ${(post.likes || 0) > 0 ? "text-rose-500" : ""}`}>
                        {post.likes?.toLocaleString() || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 md:py-40 text-center bg-white rounded-[2rem] md:rounded-[3.5rem] border-2 border-dashed border-slate-100">
              <MessageSquare className="mx-auto text-slate-200 mb-3 md:mb-4 w-10 h-10 md:w-12 md:h-12" />
              <p className="text-slate-400 font-black text-xs md:text-base">해당 카테고리에 등록된 글이 없습니다.</p>
            </div>
          )}
        </div>

        {/* ✨ 페이지네이션 하단 UI 추가 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10 md:mt-16">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-white border border-slate-100 text-slate-400 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            <div className="flex gap-1.5 md:gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all ${
                    currentPage === pageNum
                      ? "bg-slate-900 text-white shadow-xl shadow-slate-200 scale-110"
                      : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 hover:text-slate-600 shadow-sm"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-white border border-slate-100 text-slate-400 disabled:opacity-40 disabled:hover:bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};