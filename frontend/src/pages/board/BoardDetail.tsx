import { api } from "../../api/axios";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Eye, MessageSquare, Heart,
  User, Send, Wallet, Trash2, Edit3, Trash, ChevronDown, Lock
} from "lucide-react";
import { FEE, feeChipStyle } from "./feeTheme";

export const BoardDetail = ({
  onNavigate,
  post,
  isLoggedIn,
  isAdmin, // ✨ 추가: 부모(App.tsx)로부터 받은 isAdmin 권한
  user,
  setPost,
  onDelete,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onToggleCommentLike,
  onAddReply
}: any) => {
  const [commentContent, setCommentContent] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const commentSubmitLockRef = useRef(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [post?.id]);

  useEffect(() => {
    if (isLoggedIn && post?.id) {
      const updatePostView = async () => {
        try {
          const response = await api.get(`/posts/${post.id}`);
          if (response.data) {
            setPost(response.data);
          }
        } catch (error) {
          console.error("게시글 조회수 업데이트 실패:", error);
        }
      };
      updatePostView();
    }
  }, [post?.id, isLoggedIn]);

  if (!post) return <div className="pt-40 text-center text-slate-400 font-bold">게시글을 찾을 수 없습니다.</div>;

  // 회비 게시글은 목록에는 보이지만(제목·잔액), 상세 내역은 로그인한 부원만 볼 수 있다
  if (post.category === "회비" && !isLoggedIn) {
    return (
      <div className="min-h-screen pt-24 md:pt-36 pb-20 flex items-start justify-center px-4">
        <div className="max-w-md w-full text-center bg-[#fff] rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_rgb(0_0_0/0.06)] p-8 md:p-10">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={feeChipStyle}>
            <Lock size={24} />
          </div>
          <h2 className="text-[20px] md:text-[22px] font-bold text-[#1D1D1F] tracking-[-0.02em] mb-1.5">{post.title}</h2>
          <p className="text-[14px] text-[#6E6E73] mb-7">로그인한 부원만 회비 내역을 볼 수 있어요.</p>
          <div className="flex gap-2">
            <button onClick={() => onNavigate("board-page")} className="flex-1 h-12 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">목록으로</button>
            <button onClick={() => onNavigate("login")} className="flex-[2] h-12 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors">로그인하기</button>
          </div>
        </div>
      </div>
    );
  }

  const isAuthor = isLoggedIn && post.loginId === user?.loginId;
  // ✨ 핵심 수정 1: 작성자거나(isAuthor), 관리자(isAdmin)면 삭제 권한 획득!
  const canDelete = isAuthor || isAdmin; 
  // 수정은 여전히 본인(작성자)만 가능하도록 유지 (관리자라도 남의 글 수정은 안 됨)
  const canEdit = isAuthor;

  const formatStudentId = (id: string) => {
    if (!id) return "";
    const strId = String(id).trim();
    if (strId.includes("학번")) return strId;
    if (strId.length === 8) return `${strId.substring(2, 4)}학번`;
    if (strId.length === 2) return `${strId}학번`;
    return `${strId}학번`;
  };

  const handleSendComment = async () => {
    if (!commentContent.trim()) return;
    if (commentSubmitLockRef.current) return;
    commentSubmitLockRef.current = true;
    setIsCommentSubmitting(true);
    try {
      await onAddComment(post.id, commentContent);
      setCommentContent("");
    } finally {
      setIsCommentSubmitting(false);
      commentSubmitLockRef.current = false;
    }
  };

  const isFeePost = post.category === "회비";

  return (
    <div className="min-h-screen pt-24 md:pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <button
          onClick={() => onNavigate("board-page")}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors group mb-5"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 게시판
        </button>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#fff] rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_rgb(0_0_0/0.05)] p-5 md:p-10 mb-4 md:mb-5"
        >
          <header className="mb-6 md:mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-semibold"
                style={isFeePost ? feeChipStyle : { color: "#0062CC", backgroundColor: "rgb(0 113 227 / 0.1)" }}
              >
                {isFeePost && <Wallet size={12} />}
                {post.category}
              </span>
              <span className="text-[13px] text-[#8E8E93] tabular-nums">{post.date}</span>
            </div>
            <h1 className="text-[26px] md:text-[36px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight mb-5">
              {post.title}
            </h1>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[#F2F2F7] overflow-hidden shrink-0 flex items-center justify-center text-[#AEAEB2]">
                  {post.profileImage ? (
                    <img
                      src={post.profileImage}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                    />
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
                    <span className="truncate">{post.author}</span>
                    <span className="text-[12px] font-medium text-[#8E8E93] shrink-0">{formatStudentId(post.studentId)}</span>
                  </p>
                  <p className="text-[12px] text-[#8E8E93] truncate">{post.department || "AI소프트웨어학부(컴퓨터공학전공)"}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[13px] text-[#8E8E93] shrink-0">
                <Eye size={15} /> {post.views || 0}
              </span>
            </div>
          </header>

          {isFeePost && (post.feeTerm || (post.feeItems && post.feeItems.length > 0)) && <FeeInfoCard post={post} />}

          {post.content && (
            <div className="text-[15px] md:text-[17px] text-[#1D1D1F]/85 leading-[1.75] whitespace-pre-wrap">
              {post.content}
            </div>
          )}

          {post.images && post.images.length > 0 && (
            <div className="mt-8 flex flex-col gap-4">
              {post.images.map((img: string, idx: number) => (
                <div key={idx} className="rounded-[20px] overflow-hidden border border-black/[0.06]">
                  <img src={img} alt={`첨부 사진 ${idx + 1}`} className="w-full h-auto object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-8 pt-5 border-t border-black/[0.06]">
            <button
              onClick={() => onToggleLike(post.id)}
              className={`h-10 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-semibold transition-colors active:scale-95 ${post.likedByMe ? "bg-[#FF2D55]/[0.1] text-[#FF2D55]" : "bg-black/[0.05] text-[#6E6E73] hover:bg-black/[0.08]"}`}
            >
              <Heart size={16} fill={post.likedByMe ? "currentColor" : "none"} />
              {post.likes || 0}
            </button>
            <div className="ml-auto flex gap-1.5">
              {canEdit && (
                <button
                  onClick={() => onNavigate("board-write", post.id)}
                  className="h-10 px-4 rounded-full bg-black/[0.05] text-[#0071E3] text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-black/[0.08] transition-colors"
                >
                  <Edit3 size={15} /> 수정
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(post.id)}
                  className="h-10 px-4 rounded-full bg-black/[0.05] text-[#FF3B30] text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#FF3B30]/[0.08] transition-colors"
                >
                  <Trash2 size={15} /> 삭제
                </button>
              )}
            </div>
          </div>
        </motion.article>

        <section className="bg-[#fff] rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-5 md:p-10">
          <h3 className="flex items-center gap-2 text-[18px] md:text-[20px] font-bold text-[#1D1D1F] mb-5">
            <MessageSquare size={18} className="text-[#0071E3]" /> 댓글 <span className="text-[#8E8E93] font-semibold">{post.commentsList?.length || 0}</span>
          </h3>

          {isLoggedIn ? (
            <div className="write-page mb-8">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSendComment();
                  }
                }}
                placeholder="댓글을 남겨주세요. (Shift+Enter로 줄바꿈)"
                className="w-full px-4 py-3.5 rounded-2xl text-[15px] text-[#1D1D1F] outline-none resize-none min-h-[88px] transition-shadow"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSendComment}
                  disabled={!commentContent.trim() || isCommentSubmitting}
                  className="h-9 px-4 rounded-full bg-[#0071E3] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#0077ED] transition-colors disabled:bg-black/[0.08] disabled:text-[#AEAEB2]"
                >
                  <Send size={14} /> {isCommentSubmitting ? "등록 중…" : "등록"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-2xl bg-[#F5F5F7] px-5 py-6 text-center">
              <p className="text-[14px] text-[#6E6E73]">로그인한 부원만 댓글을 쓸 수 있어요.</p>
              <button onClick={() => onNavigate("login")} className="mt-2 text-[14px] font-semibold text-[#0071E3] hover:underline">로그인하기</button>
            </div>
          )}

          <div className="space-y-6 md:space-y-12">
            {post.commentsList && post.commentsList.length > 0 ? (
              post.commentsList
                .filter((c: any) => !c.reply)
                .map((c: any) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    isLoggedIn={isLoggedIn}
                    isAdmin={isAdmin} // ✨ 추가: 자식 컴포넌트에게도 관리자 권한 넘기기
                    currentUser={user}
                    onDelete={() => onDeleteComment(post.id, c.id)}
                    onToggleCommentLike={(commentId: number) => onToggleCommentLike(post.id, commentId)}
                    onAddReply={(content: string) => onAddReply(post.id, c.id, content)}
                    onDeleteReply={(replyId: number) => onDeleteComment(post.id, replyId)}
                    formatStudentId={formatStudentId}
                  />
                ))
            ) : (
              <p className="text-center py-6 md:py-10 text-slate-300 font-bold text-xs md:text-sm uppercase tracking-widest">첫 번째 댓글을 남겨보세요.</p>
            )}

            <div ref={commentsEndRef} className="h-2" />
          </div>
        </section>
      </div>
    </div>
  );
};

// ✨ [2026-10-08] 회비 "사용 내역" 카드 — 대상 학기·최종 잔액을 크게, 입금/사용 내역은 한 줄씩(입금 초록, 사용 빨강).
// 이월 금액에서 입금/사용을 반영한 최종 잔액은 서버가 계산해서 내려준다.
const FeeInfoCard = ({ post }: any) => {
  const items = post.feeItems || [];
  const income = items.filter((i: any) => i.type === "입금").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const expense = items.filter((i: any) => i.type !== "입금").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const final = post.feeFinalBalance ?? 0;

  return (
    <div className="mb-8 rounded-[22px] p-4 md:p-6" style={{ backgroundColor: FEE.wash }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={feeChipStyle}>
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-[#6E6E73]">회비 사용 내역</p>
            <p className="text-[16px] font-bold text-[#1D1D1F]">{post.feeTerm || "대상 학기 미정"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold text-[#6E6E73]">최종 잔액</p>
          <p className="text-[26px] md:text-[30px] font-bold tracking-[-0.02em] tabular-nums leading-tight" style={{ color: final < 0 ? FEE.expense : "#1D1D1F" }}>
            {final.toLocaleString()}<span className="text-[16px] font-semibold text-[#8E8E93] ml-0.5">원</span>
          </p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="rounded-2xl bg-[#fff] border border-black/[0.06] divide-y divide-black/[0.05] mb-3">
          {items.map((item: any, idx: number) => {
            const isIncome = item.type === "입금";
            return (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="shrink-0 inline-flex items-center justify-center w-11 h-6 rounded-full text-[12px] font-semibold"
                  style={{ color: isIncome ? FEE.income : FEE.expense, backgroundColor: isIncome ? "rgb(52 199 89 / 0.12)" : "rgb(255 59 48 / 0.10)" }}
                >
                  {item.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{item.description}</p>
                  {item.date && <p className="text-[12px] text-[#8E8E93] tabular-nums">{String(item.date).replace(/-/g, ".")}</p>}
                </div>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums" style={{ color: isIncome ? FEE.income : FEE.expense }}>
                  {isIncome ? "+" : "−"}{(item.amount || 0).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "이월", value: post.feeOpeningBalance ?? 0, color: "#1D1D1F", sign: "" },
          { label: "입금", value: income, color: FEE.income, sign: "+" },
          { label: "사용", value: expense, color: FEE.expense, sign: "−" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#fff]/80 border border-black/[0.05] px-3 py-2.5 text-center">
            <p className="text-[12px] font-semibold text-[#8E8E93]">{s.label}</p>
            <p className="text-[15px] md:text-[17px] font-bold tabular-nums" style={{ color: s.color }}>
              {s.value ? s.sign : ""}{Number(s.value).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CommentItem = ({
  comment,
  postId,
  currentUser,
  isAdmin, // ✨ 추가: 관리자 권한 변수 받기
  onDelete,
  onToggleCommentLike,
  onAddReply,
  onDeleteReply,
  formatStudentId,
  isLoggedIn
}: any) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showAllReplies, setShowAllReplies] = useState(false);

  // ✨ 핵심 수정 2: 댓글/대댓글 삭제도 작성자거나 관리자면 가능!
  const canDelete = (item: any) =>
    isAdmin || (Boolean(currentUser?.loginId) && Boolean(item?.loginId) && item.loginId === currentUser.loginId);

  const replies = comment.replies || [];
  const visibleReplies = showAllReplies ? replies : replies.slice(-2);
  const hasMoreReplies = replies.length > 2 && !showAllReplies;

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    onAddReply(replyContent);
    setReplyContent("");
    setShowReplyInput(false);
  };

  return (
    <div className="group/comment border-b border-slate-50 pb-6 md:pb-8 last:border-0">
      <div className="flex gap-3 md:gap-4">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-lg md:rounded-xl shrink-0 flex items-center justify-center text-slate-400 font-black text-[10px] md:text-xs border border-slate-200 shadow-sm overflow-hidden">
          {comment.profileImage ? (
            <img
              src={comment.profileImage}
              alt="cm-profile"
              className="w-full h-full object-cover"
              onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
            />
          ) : (
            comment.author ? comment.author[0] : "U"
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="font-black text-slate-900 text-xs md:text-sm truncate">{comment.author}</span>
              <span className="text-[8px] md:text-[9px] text-indigo-400 font-bold bg-indigo-50 px-1 md:px-1.5 py-0.5 rounded-md shrink-0">
                {formatStudentId(comment.studentId)}
              </span>
              <span className="text-[8px] md:text-[10px] font-bold text-slate-300 uppercase shrink-0">{comment.date}</span>
            </div>
            {canDelete(comment) && (
              <button
                onClick={onDelete}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-100 md:opacity-0 group-hover/comment:opacity-100 shrink-0 p-1"
              >
                <Trash className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" />
              </button>
            )}
          </div>
          <p className="text-slate-600 font-medium text-xs md:text-sm leading-relaxed mb-2 md:mb-3 whitespace-pre-wrap">{comment.content}</p>

          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => onToggleCommentLike(comment.id)}
              className={`flex items-center gap-1 text-[10px] md:text-[11px] font-black transition-colors ${comment.likedByMe ? "text-pink-500" : "text-slate-400 hover:text-pink-500"
                }`}
            >
              <Heart className="w-3 h-3 md:w-3 md:h-3" fill={comment.likedByMe ? "currentColor" : "none"} />
              좋아요 {comment.likes || 0}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-[10px] md:text-[11px] font-black text-slate-400 hover:text-indigo-600 transition-colors"
            >
              답글 달기
            </button>
          </div>

          <div className="mt-4 md:mt-6 ml-2 md:ml-4 border-l-2 border-slate-100 pl-3 md:pl-6 space-y-4 md:space-y-6">
            {hasMoreReplies && (
              <button
                onClick={() => setShowAllReplies(true)}
                className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold text-slate-400 hover:text-indigo-500 transition-colors py-1"
              >
                <span className="w-6 md:w-8 h-[1px] bg-slate-200"></span>
                이전 답글 {replies.length - 2}개 더 보기
              </button>
            )}

            <AnimatePresence>
              {visibleReplies.map((reply: any) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group/reply"
                >
                  <div className="flex gap-2 md:gap-3 items-start">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-slate-50 rounded-md md:rounded-lg shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center text-[8px] md:text-[10px] text-slate-300 font-black">
                      {reply.profileImage ? (
                        <img
                          src={reply.profileImage}
                          alt="reply-profile"
                          className="w-full h-full object-cover"
                          onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                        />
                      ) : (
                        reply.author?.[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <span className="font-black text-slate-900 text-[10px] md:text-[12px] truncate">{reply.author}</span>
                          <span className="text-[7px] md:text-[8px] text-indigo-400 font-bold bg-indigo-50 px-1 py-0.5 rounded-md shrink-0">
                            {formatStudentId(reply.studentId)}
                          </span>
                          <span className="text-[7px] md:text-[9px] font-bold text-slate-300 shrink-0">{reply.date}</span>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleCommentLike(reply.id); }}
                            className={`flex items-center gap-1 transition-colors ${reply.likedByMe ? "text-pink-500" : "text-slate-300 hover:text-pink-500"
                              }`}
                          >
                            <Heart className="w-2.5 h-2.5 md:w-3 md:h-3" fill={reply.likedByMe ? "currentColor" : "none"} />
                            <span className="text-[8px] md:text-[10px] font-bold">{reply.likes || 0}</span>
                          </button>

                          {canDelete(reply) && (
                            <button
                              onClick={() => onDeleteReply(reply.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors opacity-100 md:opacity-0 group-hover/reply:opacity-100 p-1"
                            >
                              <Trash className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-500 text-[10px] md:text-[12px] leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {showReplyInput && isLoggedIn && (
              <div className="flex gap-2 mt-3 md:mt-4">
                <input
                  autoFocus
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`${comment.author}님에게 답글 남기기...`}
                  className="flex-1 bg-slate-50 border-none rounded-lg md:rounded-xl px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold text-slate-600 outline-none focus:ring-1 focus:ring-indigo-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleReplySubmit();
                    }
                  }}
                />
                <button
                  onClick={handleReplySubmit}
                  disabled={!replyContent.trim()}
                  className="p-1.5 md:p-2 bg-indigo-600 text-white rounded-lg md:rounded-xl shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
