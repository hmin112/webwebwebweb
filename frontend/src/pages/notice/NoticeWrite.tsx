import { api } from "../../api/axios";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, PencilLine, AlertCircle,
  ImagePlus, Trash2, CheckCircle2
} from "lucide-react"; // ✨ lucide-react로 정상 수정
import { Button } from "../../components/ui/button";


// ✨ user(로그인 정보)와 fetchNotices(상태 갱신 함수)를 props로 받아 로그 연동 및 목록 갱신을 처리합니다.
export const NoticeWrite = ({ onNavigate, notice, user, fetchNotices }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("공지");
  const [images, setImages] = useState<string[]>([]); // 이미지 리스트 상태
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 수정 모드일 경우 기존 데이터 불러오기
  useEffect(() => {
    if (notice) {
      setTitle(notice.title);
      setContent(notice.content);
      // 백엔드 필드명 category와 프론트 필드명 tag 대응
      setTag(notice.category || notice.tag || "공지");
      setImages(notice.images || []);
    }
  }, [notice]);

  // 로컬 파일 선택 및 Base64 변환 핸들러
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

  // ✨ [백엔드 연동 저장 핸들러]
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요. ⚠️");
      return;
    }

    try {
      // 통합 로그 기록 및 엔티티 필드 매칭을 위해 payload 구성
      const payload = {
        title,
        content,
        tag: tag,
        category: tag,
        images
      };

      let response;
      if (notice && notice.id) {
        // ✨ 수정 모드 (PUT)
        response = await api.put(`/notices/${notice.id}`, payload);
      } else {
        // ✨ 등록 모드 (POST)
        response = await api.post("/notices", payload);
      }

      if (response.status === 200 || response.status === 201) {
        alert(notice ? "공지사항이 수정되었습니다! ✨" : "새로운 공지가 등록되었습니다! 🎊");

        // 부모 컴포넌트(App.tsx)의 데이터를 최신화하여 목록에 즉시 반영
        if (fetchNotices) await fetchNotices();

        onNavigate("notice-page");
      }
    } catch (error) {
      console.error("공지사항 저장 실패:", error);
      alert("서버 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-6">

        {/* 상단 헤더 및 액션 버튼 */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("notice-page")}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm transition-all hover:text-indigo-600"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <PencilLine size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {notice ? "Edit Notice" : "New Notice"}
                </span>
              </div>
              <h1 className="text-3xl font-[900] text-slate-900 tracking-tighter uppercase">
                {notice ? "공지 수정" : "새 공지 작성"}
              </h1>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => onNavigate("notice-page")}
              className="px-8 py-6 rounded-2xl font-black text-slate-400 hover:bg-slate-100"
            >
              취소
            </Button>
            <Button
              onClick={handlePublish}
              className="bg-indigo-600 text-white px-10 py-6 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95"
            >
              {notice ? "수정 완료" : "등록 완료"}
            </Button>
          </div>
        </div>

        {/* 작성 폼 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] p-10 md:p-14 shadow-sm border border-slate-100"
        >
          <form className="space-y-10" onSubmit={handlePublish}>
            {/* 태그 선택 섹션 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">태그 선택</label>
              <div className="flex gap-3">
                {["공지", "행사", "모집"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(t)}
                    className={`px-8 py-4 rounded-2xl font-black text-sm border transition-all ${tag === t ? "bg-slate-900 border-slate-900 text-white shadow-lg" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 제목 입력 섹션 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">공지 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full px-8 py-6 bg-slate-50 rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl text-slate-900 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* 내용 입력 섹션 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">상세 내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                className="w-full px-8 py-8 bg-slate-50 rounded-[2.5rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 min-h-[300px] resize-none leading-relaxed transition-all placeholder:text-slate-300"
              />
            </div>

            {/* 이미지 첨부 섹션 */}
            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-2">
                <ImagePlus size={14} /> 사진 첨부
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-[1.5rem] overflow-hidden border border-slate-100 group"
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
                  className="aspect-square rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all"
                >
                  <ImagePlus size={28} className="mb-2" />
                  <span className="text-[10px] font-black uppercase">Add Photo</span>
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