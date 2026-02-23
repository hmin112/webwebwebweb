import { api } from "../../api/axios";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, PencilLine, AlertCircle,
  ImagePlus, Trash2, Wallet, Hash
} from "lucide-react";
import { Button } from "../../components/ui/button";


// ✨ props에 user(현재 로그인 정보)와 fetchPosts(목록 갱신 함수)를 추가했습니다.
export const BoardWrite = ({ onNavigate, isAdmin, user, fetchPosts, post }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState(isAdmin ? "회비" : "자유");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 수정 모드 시 기존 데이터 동기화
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      setImages(post.images || []);
    }
  }, [post]);

  useEffect(() => {
    if (post && post.loginId !== user?.loginId) {
      alert("본인 글만 수정할 수 있습니다.");
      onNavigate("board-detail", post.id);
    }
  }, [post, user?.loginId, onNavigate]);

  const categories = isAdmin ? ["회비", "자유", "질문"] : ["자유", "질문"];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ✨ [등록하기/수정완료] 버튼 백엔드 연동 로직
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (post && post.loginId !== user?.loginId) {
      alert("본인 글만 수정할 수 있습니다.");
      return;
    }

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title,
        content,
        category,
        images
      };

      if (post) {
        // ✨ 게시글 수정 (PUT)
        await api.put(`/posts/${post.id}`, payload);
        alert("게시글이 수정되었습니다. ✨");
      } else {
        // ✨ 게시글 등록 (POST)
        await api.post("/posts", payload);
        alert("게시글이 성공적으로 등록되었습니다. ✨");
      }

      // 갱신 및 이동
      if (fetchPosts) await fetchPosts();
      onNavigate("board-page");
    } catch (error) {
      console.error("게시글 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">

        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("board-page")}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <PencilLine size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {post ? "Edit Post" : "New Post"}
                </span>
              </div>
              <h1 className="text-3xl font-[900] text-slate-900 tracking-tighter uppercase">
                {post ? "게시글 수정" : "새 글 작성"}
              </h1>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onNavigate("board-page")} className="px-8 py-6 rounded-2xl font-black text-slate-400">취소</Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black shadow-xl disabled:bg-slate-300 transition-all active:scale-95"
            >
              {isSubmitting ? "처리 중..." : (post ? "수정 완료" : "등록하기")}
            </Button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-100">
          <form className="space-y-10" onSubmit={handleSubmit}>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-2">
                <AlertCircle size={14} /> 카테고리
              </label>
              <div className="flex gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all text-sm border ${category === cat
                        ? (cat === "회비" ? "bg-amber-600 border-amber-600 text-white shadow-lg" : "bg-slate-900 border-slate-900 text-white shadow-lg")
                        : "bg-white border-slate-100 text-slate-400"
                      }`}
                  >
                    {cat === "회비" ? <Wallet size={16} /> : <Hash size={16} />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">글 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력해주세요"
                className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl text-slate-900 placeholder:text-slate-300 transition-all"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">상세 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력해주세요."
                className="w-full px-8 py-8 bg-slate-50 rounded-[2.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 min-h-[300px] resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-2">
                <ImagePlus size={14} /> 사진 첨부
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-[1.5rem] overflow-hidden border border-slate-100 group shadow-sm"
                    >
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={20} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all group"
                >
                  <ImagePlus size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Photo</span>
                </button>
              </div>
              <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            </div>

          </form>
        </motion.div>
      </div>
    </div>
  );
};
