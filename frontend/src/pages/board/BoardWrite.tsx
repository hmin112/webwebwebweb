import { api } from "../../api/axios";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, PencilLine, AlertCircle,
  ImagePlus, Trash2, Wallet, Hash
} from "lucide-react";
import { Button } from "../../components/ui/button";

export const BoardWrite = ({ onNavigate, isAdmin, user, fetchPosts, post }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // ✨ images: UI 프리뷰용 (Base64 or URL)
  const [images, setImages] = useState<string[]>([]);
  // ✨ imageFiles: 서버 전송용 실제 파일 객체 저장
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  
  const [category, setCategory] = useState(isAdmin ? "회비" : "자유");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setCategory(post.category);
      setImages(post.images || []); // 기존 서버에 저장된 이미지 URL들
    }
  }, [post]);

  useEffect(() => {
    if (post && post.loginId !== user?.loginId) {
      alert("본인 글만 수정할 수 있습니다.");
      onNavigate("board-detail", post.id);
    }
  }, [post, user?.loginId, onNavigate]);

  const categories = isAdmin ? ["회비", "자유", "질문"] : ["자유", "질문"];

  // ✨ 이미지 업로드 핸들러 최적화
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // 1. 서버로 보낼 실제 파일 객체 추가
      setImageFiles(prev => [...prev, ...fileArray]);

      // 2. 화면에 보여줄 프리뷰 생성
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // ✨ 이미지 제거 핸들러
  const removeImage = (index: number) => {
    // 프리뷰 목록에서 제거
    setImages(prev => prev.filter((_, i) => i !== index));
    // 실제 파일 객체 목록에서도 제거 (기존 이미지는 URL이므로 제외됨)
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  // ✨ 제출 핸들러 (JSON 대신 FormData 사용)
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
      // 🚀 Base64 텍스트 전송 방식을 버리고 FormData 객체 생성
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("category", category);
      
      // 실제 파일들만 'files'라는 이름으로 추가
      imageFiles.forEach((file) => {
        formData.append("files", file);
      });

      // 기존 이미지를 유지해야 하는 경우(수정 시)를 위한 로직 (필요 시 추가)
      const existingImages = images.filter(img => img.startsWith('http'));
      formData.append("existingImages", JSON.stringify(existingImages));

      if (post) {
        // multipart/form-data 전송 (✨ 헤더 삭제 완료)
        await api.put(`/posts/${post.id}`, formData);
        alert("게시글이 수정되었습니다. ✨");
      } else {
        // ✨ 헤더 삭제 완료
        await api.post("/posts", formData);
        alert("게시글이 성공적으로 등록되었습니다. ✨");
      }

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
    <div className="min-h-screen bg-slate-50 pt-24 md:pt-32 pb-16 md:pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        <div className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => onNavigate("board-page")}
              className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm transition-all shrink-0"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 mb-0.5 md:mb-1">
                <PencilLine className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {post ? "Edit Post" : "New Post"}
                </span>
              </div>
              <h1 className="text-[17px] sm:text-2xl md:text-3xl font-[900] text-slate-900 tracking-tighter uppercase whitespace-nowrap truncate">
                {post ? "게시글 수정" : "새 글 작성"}
              </h1>
            </div>
          </div>

          <div className="flex gap-1.5 md:gap-3 shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate("board-page")} 
              className="px-3 py-2 md:px-8 md:py-3.5 rounded-lg md:rounded-2xl font-black text-slate-400 text-[11px] md:text-sm h-auto"
            >
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-3 py-2 md:px-10 md:py-3.5 rounded-lg md:rounded-2xl font-black shadow-xl disabled:bg-slate-300 transition-all active:scale-95 text-[11px] md:text-sm h-auto"
            >
              {isSubmitting ? "처리 중..." : (post ? "수정 완료" : "등록하기")}
            </Button>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white rounded-[1.5rem] md:rounded-[3rem] p-5 md:p-14 shadow-sm border border-slate-100"
        >
          <form className="space-y-6 md:space-y-10" onSubmit={handleSubmit}>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1.5 md:gap-2">
                <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" /> 카테고리
              </label>
              <div className="flex flex-nowrap gap-2 md:gap-3 w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black transition-all text-[11px] md:text-sm border ${category === cat
                        ? (cat === "회비" ? "bg-amber-600 border-amber-600 text-white shadow-lg" : "bg-slate-900 border-slate-900 text-white shadow-lg")
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      }`}
                  >
                    {cat === "회비" ? <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Hash className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">글 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력해주세요"
                className="w-full px-5 py-4 md:px-8 md:py-6 bg-slate-50 rounded-[1.25rem] md:rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm md:text-xl text-slate-900 placeholder:text-slate-300 transition-all"
              />
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">상세 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력해주세요."
                className="w-full px-5 py-5 md:px-8 md:py-8 bg-slate-50 rounded-[1.25rem] md:rounded-[2.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs md:text-base text-slate-700 min-h-[200px] md:min-h-[300px] resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1.5 md:gap-2">
                <ImagePlus className="w-3.5 h-3.5 md:w-4 md:h-4" /> 사진 첨부
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-4">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-xl md:rounded-[1.5rem] overflow-hidden border border-slate-100 group shadow-sm"
                    >
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl md:rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all group shrink-0"
                >
                  <ImagePlus size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Add Photo</span>
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