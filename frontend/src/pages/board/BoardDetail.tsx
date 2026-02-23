import { api } from "../../api/axios";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Eye, MessageSquare, Heart,
  User, Send, Wallet, Trash2, Edit3, Trash, ChevronDown
} from "lucide-react";
import { Button } from "../../components/ui/button";


export const BoardDetail = ({
  onNavigate,
  post,
  isLoggedIn,
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
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (post?.commentsList?.length > 0) {
      scrollToBottom();
    }
  }, [post?.commentsList?.length]);

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

  const isAuthor = isLoggedIn && post.loginId === user?.loginId;
  const canDelete = isAuthor;
  const canEdit = isAuthor;

  // ✨ 학번 포맷팅 함수 수정 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "";
    const strId = String(id).trim();
    if (strId.includes("학번")) return strId;
    if (strId.length === 8) return `${strId.substring(2, 4)}학번`;
    if (strId.length === 2) return `${strId}학번`;
    return `${strId}학번`;
  };

  const handleSendComment = () => {
    if (!commentContent.trim()) return;
    onAddComment(post.id, commentContent);
    setCommentContent("");
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">

        <button
          onClick={() => onNavigate("board-page")}
          className="flex items-center gap-2 text-slate-400 font-black mb-8 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          목록으로 돌아가기
        </button>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-10 md:p-16 shadow-sm border border-slate-100 mb-8 overflow-hidden"
        >
          <header className="mb-10 border-b border-slate-50 pb-10">
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${post.category === "회비"
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}>
                {post.category === "회비" && <Wallet size={10} className="inline mr-1 mb-0.5" />}
                {post.category}
              </span>
              <span className="text-slate-300 text-xs font-bold">{post.date}</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-[900] text-slate-900 tracking-tighter mb-8 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm overflow-hidden">
                  {post.profileImage ? (
                    <img src={post.profileImage} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} />
                  )}
                </div>
                <div>
                  <p className="text-slate-900 font-black text-lg flex items-center gap-2">
                    {post.author}
                    <span className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg">
                      {formatStudentId(post.studentId)}
                    </span>
                  </p>
                  {/* ✨ 학과 정보 표시 (데이터가 없을 경우 기본 학과명 출력) */}
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                    {post.department || "AI소프트웨어학부(컴퓨터공학전공)"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Eye size={16} /> {post.views || 0}
                </span>
              </div>
            </div>
          </header>

          <div className="prose prose-slate max-w-none mb-16">
            <div className="text-slate-600 text-lg font-medium leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>

            {post.images && post.images.length > 0 && (
              <div className="mt-12 flex flex-col gap-8">
                {post.images.map((img: string, idx: number) => (
                  <motion.div
                    key={idx}
                    className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
                  >
                    <img src={img} alt={`post-img-${idx}`} className="w-full h-auto object-cover" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-50">
            <Button
              onClick={() => onToggleLike(post.id)}
              className={`rounded-2xl px-8 py-7 font-black transition-all flex items-center gap-2 shadow-none border-none active:scale-95 ${post.likedByMe ? "bg-pink-50 text-pink-500" : "bg-slate-50 text-slate-400"
                }`}
            >
              <Heart size={20} fill={post.likedByMe ? "currentColor" : "none"} />
              좋아요 {post.likes || 0}
            </Button>

            <div className="ml-auto flex gap-3">
              {canEdit && (
                <Button
                  onClick={() => onNavigate("board-write", post.id)}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black rounded-xl px-6 flex items-center gap-2 transition-all shadow-none border-none"
                >
                  <Edit3 size={18} /> 수정
                </Button>
              )}

              {canDelete && (
                <Button
                  onClick={() => onDelete(post.id)}
                  className="bg-red-50 text-red-500 hover:bg-red-600 hover:text-white font-black rounded-xl px-6 flex items-center gap-2 transition-all shadow-none border-none"
                >
                  <Trash2 size={18} /> 삭제
                </Button>
              )}
            </div>
          </div>
        </motion.article>

        <section className="bg-white rounded-[3rem] p-10 md:p-16 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-10">
            <MessageSquare className="text-indigo-600" size={24} />
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">댓글 {post.commentsList?.length || 0}</h3>
          </div>

          {isLoggedIn ? (
            <div className="relative mb-12 group">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="따뜻한 댓글 한마디를 남겨주세요."
                className="w-full p-6 bg-slate-50 rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 min-h-[120px] transition-all"
              />
              <button
                onClick={handleSendComment}
                className="absolute bottom-4 right-4 p-4 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all disabled:bg-slate-200"
                disabled={!commentContent.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          ) : (
            <div className="mb-12 p-10 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 font-bold text-sm">로그인한 부원만 댓글을 작성할 수 있습니다.</p>
              <button onClick={() => onNavigate("login")} className="mt-4 text-indigo-600 font-black text-sm hover:underline">로그인하러 가기 →</button>
            </div>
          )}

          <div className="space-y-12">
            {post.commentsList && post.commentsList.length > 0 ? (
              post.commentsList
                .filter((c: any) => !c.reply)
                .map((c: any) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    postId={post.id}
                    isLoggedIn={isLoggedIn}
                    currentUser={user}
                    onDelete={() => onDeleteComment(post.id, c.id)}
                    onToggleCommentLike={(commentId: number) => onToggleCommentLike(post.id, commentId)}
                    onAddReply={(content: string) => onAddReply(post.id, c.id, content)}
                    onDeleteReply={(replyId: number) => onDeleteComment(post.id, replyId)}
                    formatStudentId={formatStudentId}
                  />
                ))
            ) : (
              <p className="text-center py-10 text-slate-300 font-bold text-sm uppercase tracking-widest">첫 번째 댓글을 남겨보세요.</p>
            )}

            <div ref={commentsEndRef} className="h-2" />
          </div>
        </section>
      </div>
    </div>
  );
};

const CommentItem = ({
  comment,
  postId,
  currentUser,
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

  const canDelete = (item: any) =>
    Boolean(currentUser?.loginId) && Boolean(item?.loginId) && item.loginId === currentUser.loginId;

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
    <div className="group/comment border-b border-slate-50 pb-8 last:border-0">
      <div className="flex gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center text-slate-400 font-black text-xs border border-slate-200 shadow-sm overflow-hidden">
          {comment.profileImage ? (
            <img src={comment.profileImage} alt="cm-profile" className="w-full h-full object-cover" />
          ) : (
            comment.author ? comment.author[0] : "U"
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">{comment.author}</span>
              <span className="text-[9px] text-indigo-400 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md">
                {formatStudentId(comment.studentId)}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">{comment.date}</span>
            </div>
            {canDelete(comment) && (
              <button
                onClick={onDelete}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/comment:opacity-100"
              >
                <Trash size={14} />
              </button>
            )}
          </div>
          <p className="text-slate-600 font-medium text-sm leading-relaxed mb-3">{comment.content}</p>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onToggleCommentLike(comment.id)}
              className={`flex items-center gap-1 text-[11px] font-black transition-colors ${comment.likedByMe ? "text-pink-500" : "text-slate-400 hover:text-pink-500"
                }`}
            >
              <Heart size={12} fill={comment.likedByMe ? "currentColor" : "none"} />
              좋아요 {comment.likes || 0}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-[11px] font-black text-slate-400 hover:text-indigo-600 transition-colors"
            >
              답글 달기
            </button>
          </div>

          <div className="mt-6 ml-4 border-l-2 border-slate-100 pl-6 space-y-6">
            {hasMoreReplies && (
              <button
                onClick={() => setShowAllReplies(true)}
                className="flex items-center gap-2 text-[11px] font-bold text-slate-400 hover:text-indigo-500 transition-colors py-1"
              >
                <span className="w-8 h-[1px] bg-slate-200"></span>
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
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 bg-slate-50 rounded-lg shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-black">
                      {reply.profileImage ? (
                        <img src={reply.profileImage} className="w-full h-full object-cover" />
                      ) : (
                        reply.author?.[0]
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-[12px]">{reply.author}</span>
                          <span className="text-[8px] text-indigo-400 font-bold bg-indigo-50 px-1 py-0.5 rounded-md">
                            {formatStudentId(reply.studentId)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-300">{reply.date}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleCommentLike(reply.id); }}
                            className={`flex items-center gap-1 transition-colors ${reply.likedByMe ? "text-pink-500" : "text-slate-300 hover:text-pink-500"
                              }`}
                          >
                            <Heart size={12} fill={reply.likedByMe ? "currentColor" : "none"} />
                            <span className="text-[10px] font-bold">{reply.likes || 0}</span>
                          </button>

                          {canDelete(reply) && (
                            <button
                              onClick={() => onDeleteReply(reply.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover/reply:opacity-100"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-500 text-[12px] leading-relaxed">{reply.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {showReplyInput && isLoggedIn && (
              <div className="flex gap-2 mt-4">
                <input
                  autoFocus
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`${comment.author}님에게 답글 남기기...`}
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-1 focus:ring-indigo-300"
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
                  className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm hover:bg-indigo-700 disabled:bg-slate-200 transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
