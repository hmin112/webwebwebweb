import { api } from "../../api/axios";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, PencilLine, AlertCircle,
  ImagePlus, Trash2, CheckCircle2
} from "lucide-react";
import { Button } from "../../components/ui/button";

export const NoticeWrite = ({ onNavigate, notice, user, fetchNotices }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("공지");
  const [images, setImages] = useState<string[]>([]);
  // ✨ 실제 서버 전송용 파일 객체를 담는 state
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (notice) {
      setTitle(notice.title);
      setContent(notice.content);
      setTag(notice.category || notice.tag || "공지");
      setImages(notice.images || []);
    }
  }, [notice]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // 실제 파일 객체 저장
      setImageFiles(prev => [...prev, ...fileArray]);

      // 화면 미리보기용 Base64 생성
      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    const removedImage = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));

    // 삭제된 이미지가 기존 서버에 있던 사진(http)이 아닌 새로 추가한 파일인 경우
    if (!removedImage.startsWith('http')) {
      const newFileIndex = images.slice(0, index).filter(img => !img.startsWith('http')).length;
      setImageFiles(prev => prev.filter((_, i) => i !== newFileIndex));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요. ⚠️");
      return;
    }

    try {
      // ✨ JSON 객체 대신 FormData 사용 (파일 전송을 위함)
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("tag", tag);
      formData.append("category", tag);

      // 실제 이미지 파일들 첨부
      imageFiles.forEach(file => {
        formData.append("files", file);
      });

      // 기존에 올라가 있던 이미지 URL 유지 (수정 시)
      const existingImages = images.filter(img => img.startsWith('http'));
      formData.append("existingImages", JSON.stringify(existingImages));

      let response;
      if (notice && notice.id) {
        // ✨ 헤더 삭제 완료
        response = await api.put(`/notices/${notice.id}`, formData);
      } else {
        // ✨ 헤더 삭제 완료
        response = await api.post("/notices", formData);
      }

      if (response.status === 200 || response.status === 201) {
        alert(notice ? "공지사항이 수정되었습니다! ✨" : "새로운 공지가 등록되었습니다! 🎊");

        if (fetchNotices) await fetchNotices();

        onNavigate("notice-page");
      }
    } catch (error) {
      console.error("공지사항 저장 실패:", error);
      alert("서버 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 md:pt-32 pb-16 md:pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        <div className="flex items-center justify-between mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => onNavigate("notice-page")}
              className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm transition-all hover:text-indigo-600 shrink-0"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 mb-0.5 md:mb-1">
                <PencilLine className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {notice ? "Edit Notice" : "New Notice"}
                </span>
              </div>
              <h1 className="text-[17px] sm:text-2xl md:text-3xl font-[900] text-slate-900 tracking-tighter uppercase whitespace-nowrap truncate">
                {notice ? "공지 수정" : "새 공지 작성"}
              </h1>
            </div>
          </div>
          <div className="flex gap-1.5 md:gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onNavigate("notice-page")}
              className="px-3 py-2 md:px-8 md:py-6 rounded-lg md:rounded-2xl font-black text-slate-400 hover:bg-slate-100 text-[11px] md:text-sm h-auto"
            >
              취소
            </Button>
            <Button
              onClick={handlePublish}
              className="bg-indigo-600 text-white px-3 py-2 md:px-10 md:py-6 rounded-lg md:rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 text-[11px] md:text-sm h-auto"
            >
              {notice ? "수정 완료" : "등록 완료"}
            </Button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[1.5rem] md:rounded-[3rem] p-5 md:p-14 shadow-sm border border-slate-100"
        >
          <form className="space-y-6 md:space-y-10" onSubmit={handlePublish}>
            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">태그 선택</label>
              <div className="flex flex-nowrap gap-2 md:gap-3 w-full">
                {["공지", "행사", "모집"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`flex-1 py-2.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black text-[11px] md:text-sm border transition-all ${tag === t ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">공지 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full px-5 py-4 md:px-8 md:py-6 bg-slate-50 rounded-[1.25rem] md:rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm md:text-xl text-slate-900 transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">상세 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                className="w-full px-5 py-5 md:px-8 md:py-8 bg-slate-50 rounded-[1.25rem] md:rounded-[2.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs md:text-base text-slate-700 min-h-[200px] md:min-h-[300px] resize-none leading-relaxed transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-1.5 md:gap-2">
                <ImagePlus className="w-3.5 h-3.5 md:w-4 md:h-4" /> 사진 첨부
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-4">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-xl md:rounded-[1.5rem] overflow-hidden border border-slate-100 group"
                    >
                      <img src={img} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl md:rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all"
                >
                  <ImagePlus className="w-5 h-5 md:w-7 md:h-7 mb-1 md:mb-2" />
                  <span className="text-[8px] md:text-[10px] font-black uppercase">Add Photo</span>
                </button>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};