import { api } from "../../api/axios";
import { useState, useEffect, useRef } from "react";
import { DATE_MASK, DateMaskInput, isValidDate, splitDateRange } from "../../components/ui/DateMaskInput";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Type, Image as ImageIcon, Link as LinkIcon, X, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { FileDropZone } from "../../components/ui/FileDropZone";

// ✨ user, fetchEvents 프롭을 추가하여 로그 연동 및 목록 갱신을 처리합니다.
export const EventWrite = ({ onNavigate, onSave, event, fetchEvents, user }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 초기 이미지 링크를 제거하고 비어있는 상태로 시작합니다.
  const [formData, setFormData] = useState({
    category: "학술",
    title: "",
    date: "",
    location: "",
    content: "",
    image: ""
  });

  // ✨ 실제 서버 전송용 파일 객체를 담는 state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  // ✨ [2026-09-30] 여러 날 행사면 종료일 — 저장할 때 "2026.04.27 ~ 2026.04.29"로 합쳐서 date에 넣는다
  const [dateEnd, setDateEnd] = useState("");

  useEffect(() => {
    // 예전에 "2026.4.27"처럼 한 자리로 적힌 날짜도 수정 화면에서는 "2026.04.27"로 맞춰 보여준다
    if (event) {
      const [start, end] = splitDateRange(event.date);
      setFormData({ ...event, date: start });
      setDateEnd(end);
    }
  }, [event]);

  // ✨ 로컬 파일 선택 시 호출되는 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file); // 실제 파일 객체 저장
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string }); // 화면 미리보기용
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (submitLockRef.current) return;
    if (!formData.title || !formData.date || !formData.location || !formData.content) {
      return alert("정보를 모두 입력해주세요. ⚠️");
    }
    if (!isValidDate(formData.date)) {
      return alert("시작일을 2026.04.27처럼 숫자 8자리로 입력해주세요. (없는 날짜는 안 돼요)");
    }
    if (dateEnd && (!isValidDate(dateEnd) || dateEnd < formData.date)) {
      return alert("종료일을 확인해주세요. 하루 행사면 비워두면 돼요.");
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // ✨ JSON 객체 대신 FormData 사용 (파일 전송을 위함)
      const submitData = new FormData();
      submitData.append("category", formData.category);
      submitData.append("title", formData.title);
      submitData.append("date", dateEnd && dateEnd !== formData.date ? `${formData.date} ~ ${dateEnd}` : formData.date);
      submitData.append("location", formData.location);
      submitData.append("content", formData.content);

      // 1. 파일이 첨부된 경우 (✨ file -> files 로 수정 완료!)
      if (imageFile) {
        submitData.append("files", imageFile); 
      } 
      // 2. 파일 없이 직접 URL만 입력했거나, 기존 이미지가 유지된 경우
      else if (formData.image && (formData.image.startsWith('http') || formData.image.startsWith('https'))) {
        submitData.append("existingImage", formData.image);
      }

      let response;
      if (event && event.id) {
        response = await api.put(`/events/${event.id}`, submitData); // ✅ 뒤에 헤더 옵션 삭제 완료
      } else {
        response = await api.post("/events", submitData); // ✅ 뒤에 헤더 옵션 삭제 완료
      }

      if (response.status === 200 || response.status === 201) {
        alert(event ? "수정되었습니다! ✨" : "새로운 행사가 등록되고 로그에 기록되었습니다! 🎊");
        if (fetchEvents) await fetchEvents();
        onNavigate("event-page");
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="write-page min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={() => onNavigate("event-page")}
            className="text-slate-400 font-bold flex items-center gap-2 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} /> 작성 취소
          </button>
          <Button
            onClick={handlePublish}
            disabled={isSubmitting}
            className="bg-indigo-600 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            {isSubmitting ? "처리 중..." : (event ? "수정 완료" : "등록 완료")}
          </Button>
        </div>

        <div className="space-y-8">
          <div className="flex gap-2">
            {["학술", "친목", "대회", "기타"].map((c) => (
              <button
                key={c}
                onClick={() => setFormData({ ...formData, category: c })}
                className={`px-6 py-2.5 rounded-full text-xs font-black transition-all ${formData.category === c ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
              >
                {c}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="행사 제목을 입력하세요"
            className="bare-field w-full py-4 text-3xl md:text-4xl font-bold text-[#1D1D1F] border-none outline-none tracking-[-0.02em] placeholder:text-[#D1D1D6]"
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Date</label>
              {/* ✨ [2026-09-30] 숫자만 입력하면 2026.04.27 모양으로 점이 자동으로 들어간다. 여러 날 행사면 종료일도 */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <DateMaskInput size="lg" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
                <span className="text-slate-300 font-bold">~</span>
                <DateMaskInput size="lg" value={dateEnd} onChange={setDateEnd} />
              </div>
              <p className={`text-[11px] ml-1 ${
                (formData.date.length === DATE_MASK.length && !isValidDate(formData.date)) || (dateEnd.length === DATE_MASK.length && (!isValidDate(dateEnd) || dateEnd < formData.date))
                  ? "text-rose-500" : "text-slate-400"
              }`}>
                {formData.date.length === DATE_MASK.length && !isValidDate(formData.date)
                  ? "없는 날짜예요. 다시 확인해 주세요."
                  : dateEnd.length === DATE_MASK.length && (!isValidDate(dateEnd) || dateEnd < formData.date)
                    ? "종료일을 확인해 주세요. (시작일보다 빠르거나 없는 날짜)"
                    : "숫자 8자리만 입력하면 돼요 (예: 20260427). 하루 행사면 오른쪽(종료일)은 비워두세요."}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Location</label>
              <input
                type="text"
                placeholder="예: IT융합대학 2층"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* ✨ 개선된 이미지 섹션: 파일 업로드 + 링크 입력 */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Event Image</label>
            <FileDropZone inputRef={fileInputRef} label="사진을 놓으면 올라가요">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                  <Upload size={18} /> 파일 선택 · 끌어다 놓기
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div className="relative">
                <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  placeholder="또는 이미지 주소(URL)를 입력하세요"
                  value={formData.image || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    setImageFile(null); // URL 직접 입력 시 로컬 파일 우선순위 해제
                  }}
                  className="w-full pl-14 pr-12 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                {formData.image && (
                  <button
                    onClick={() => {
                      setFormData({ ...formData, image: "" });
                      setImageFile(null);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {formData.image && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="relative rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 group"
                  >
                    <img src={formData.image} alt="Preview" className="w-full h-auto max-h-[300px] object-contain" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </FileDropZone>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="행사에 대한 상세 내용을 자유롭게 입력하세요..."
              className="bare-field w-full min-h-[400px] text-lg font-medium outline-none resize-none leading-relaxed placeholder:text-[#D1D1D6]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
