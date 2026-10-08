import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Heart, Lock, MessageSquare, Pencil, Search } from "lucide-react";
import { CategoryChip, CategorySegment } from "./CategorySegment";
import { FEE } from "./feeTheme";

// ✨ [2026-10-08] 게시판 목록 — 애플 스타일: 옅은 회색 바탕, 유리 분류 버튼, 흰 카드 목록.
// 회비 글은 비로그인에게도 제목·잔액까지만 보이고, 상세 내역은 로그인해야 열린다(서버가 목록에서 내역을 빼서 내려줌).

const CATEGORIES = ["전체", "회비", "자유", "질문"];
const PER_PAGE = 10;

const formatStudentId = (id: string) => {
  if (!id) return "";
  const s = String(id).trim();
  if (s.includes("학번")) return s;
  if (s.length === 8) return `${s.substring(2, 4)}학번`;
  return `${s}학번`;
};

export const BoardPage = ({ onNavigate, posts, isLoggedIn }: any) => {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<string, number> = { 전체: posts.length };
    for (const cat of CATEGORIES.slice(1)) c[cat] = posts.filter((p: any) => p.category === cat).length;
    return c;
  }, [posts]);

  const q = searchQuery.trim().toLowerCase();
  const filteredPosts = posts
    .filter((p: any) => activeCategory === "전체" || p.category === activeCategory)
    .filter((p: any) => !q || p.title?.toLowerCase().includes(q) || p.author?.toLowerCase().includes(q));

  const totalPages = Math.ceil(filteredPosts.length / PER_PAGE);
  const currentPosts = filteredPosts.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const goWrite = () => {
    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }
    onNavigate("board-write");
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pt-24 md:pt-28 pb-20">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <button
          onClick={() => onNavigate("home")}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors group mb-4"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 홈
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[34px] md:text-[44px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight">게시판</h1>
            <p className="text-[15px] text-[#6E6E73] mt-1">회비 내역과 부원들의 이야기, 질문을 나눠요.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none" />
              <input
                type="text"
                placeholder="제목·작성자 검색"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full md:w-64 h-11 pl-10 pr-4 rounded-full text-[14px] outline-none"
              />
            </div>
            <button
              onClick={goWrite}
              className="h-11 px-5 rounded-full bg-[#0071E3] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#0077ED] transition-colors shrink-0"
            >
              <Pencil size={15} /> 글쓰기
            </button>
          </div>
        </div>

        <div className="mb-5">
          <CategorySegment
            options={CATEGORIES}
            value={activeCategory}
            onChange={(c) => { setActiveCategory(c); setCurrentPage(1); }}
            layoutId="boardListCategory"
            counts={counts}
          />
        </div>

        {currentPosts.length > 0 ? (
          <div className="space-y-2.5">
            {currentPosts.map((post: any) => {
              const isFee = post.category === "회비";
              const comments = post.commentCount || post.commentsList?.length || post.comments?.length || 0;
              return (
                <motion.button
                  key={post.id}
                  type="button"
                  onClick={() => onNavigate("board-detail", post.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  className="w-full text-left bg-[#fff] rounded-[22px] border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_30px_rgb(0_0_0/0.06)] transition-shadow px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CategoryChip category={post.category} size="sm" />
                      {isFee && !isLoggedIn && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8E8E93]"><Lock size={11} /> 로그인 필요</span>
                      )}
                      <span className="text-[12px] text-[#8E8E93] tabular-nums truncate">{post.date}</span>
                    </div>
                    <h3 className="text-[16px] md:text-[17px] font-semibold text-[#1D1D1F] tracking-[-0.01em] truncate">{post.title}</h3>
                    {isFee && post.feeTerm ? (
                      <p className="text-[13px] text-[#6E6E73] mt-0.5 truncate">
                        {post.feeTerm} · 잔액{" "}
                        <span className="font-semibold tabular-nums" style={{ color: (post.feeFinalBalance ?? 0) < 0 ? FEE.expense : "#1D1D1F" }}>
                          {(post.feeFinalBalance ?? 0).toLocaleString()}원
                        </span>
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#8E8E93] mt-0.5 truncate">{post.content}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-black/[0.05]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full overflow-hidden bg-[#F2F2F7] shrink-0 flex items-center justify-center text-[11px] font-semibold text-[#8E8E93]">
                        {post.profileImage ? (
                          <img src={post.profileImage} alt="" className="w-full h-full object-cover" onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }} />
                        ) : (
                          post.author?.[0]
                        )}
                      </span>
                      <span className="text-[13px] font-medium text-[#1D1D1F] truncate max-w-[9rem]">{post.author}</span>
                      <span className="text-[12px] text-[#8E8E93] shrink-0">{formatStudentId(post.studentId)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[#8E8E93] tabular-nums">
                      <span className="inline-flex items-center gap-1"><Eye size={14} /> {(post.views || 0).toLocaleString()}</span>
                      <span className="inline-flex items-center gap-1"><MessageSquare size={14} /> {comments.toLocaleString()}</span>
                      <span className={`inline-flex items-center gap-1 ${(post.likes || 0) > 0 ? "text-[#FF2D55]" : ""}`}>
                        <Heart size={14} fill={(post.likes || 0) > 0 ? "currentColor" : "none"} /> {(post.likes || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#fff] rounded-[22px] border border-black/[0.05] py-20 text-center">
            <MessageSquare size={32} className="mx-auto text-[#C7C7CC] mb-3" />
            <p className="text-[15px] font-semibold text-[#1D1D1F]">{q ? "검색 결과가 없어요" : "아직 글이 없어요"}</p>
            <p className="text-[13px] text-[#8E8E93] mt-1">{q ? "다른 단어로 찾아보세요." : "첫 글을 남겨보세요."}</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[#fff] border border-black/[0.05] shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="이전 페이지"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#1D1D1F]/60 hover:bg-black/[0.05] disabled:opacity-30"
              ><ChevronLeft size={17} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setCurrentPage(n)}
                  className={`relative w-9 h-9 rounded-full text-[14px] font-semibold tabular-nums transition-colors ${currentPage === n ? "text-white" : "text-[#1D1D1F]/70 hover:bg-black/[0.05]"}`}
                >
                  {currentPage === n && (
                    <motion.span layoutId="boardPagePill" className="absolute inset-0 rounded-full bg-[#1D1D1F]" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />
                  )}
                  <span className="relative">{n}</span>
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="다음 페이지"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#1D1D1F]/60 hover:bg-black/[0.05] disabled:opacity-30"
              ><ChevronRight size={17} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
