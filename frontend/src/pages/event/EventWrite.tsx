import { api } from "../../api/axios";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Save, Type, Image as ImageIcon, Link as LinkIcon, X, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { FileDropZone } from "../../components/ui/FileDropZone";

// ✨ user, fetchEvents 프롭을 추가하여 로그 연동 및 목록 갱신을 처리합니다.
// ✨ [2026-09-30] 행사 날짜는 "2026.04.27" 한 가지 형식으로 — 숫자만 받아 점은 자동으로
const DATE_MASK = "YYYY.MM.DD";
const formatEventDateInput = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join(".");
};
const normalizeEventDate = (raw?: string) => {
  const m = (raw || "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}.${m[2].padStart(2, "0")}.${m[3].padStart(2, "0")}` : formatEventDateInput(raw || "");
};
const isValidEventDate = (s: string) => {
  const m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
};

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

  useEffect(() => {
    // 예전에 "2026.4.27"처럼 한 자리로 적힌 날짜도 수정 화면에서는 "2026.04.27"로 맞춰 보여준다
    if (event) setFormData({ ...event, date: normalizeEventDate(event.date) });
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
    if (!isValidEventDate(formData.date)) {
      return alert("날짜를 2026.04.27처럼 숫자 8자리로 입력해주세요. (없는 날짜는 안 돼요)");
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // ✨ JSON 객체 대신 FormData 사용 (파일 전송을 위함)
      const submitData = new FormData();
      submitData.append("category", formData.category);
      submitData.append("title", formData.title);
      submitData.append("date", formData.date);
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
    <div className="min-h-screen bg-white pb-20 pt-32">
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
            className="w-full py-4 text-4xl font-black text-slate-900 border-none outline-none tracking-tight placeholder:text-slate-200"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Date</label>
              {/* ✨ [2026-09-30] 숫자만 입력하면 2026.04.27 모양으로 점이 자동으로 들어간다. 남은 자리는 흐린 YYYY.MM.DD로 보여서
                  몇 칸 남았는지 한눈에 보인다 (캘린더가 이 형식으로 날짜를 읽는다) */}
              <div className="relative bg-slate-50 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                <div aria-hidden className="absolute inset-0 px-6 py-4 font-bold tabular-nums pointer-events-none whitespace-pre">
                  <span className="invisible">{formData.date}</span>
                  <span className="text-slate-300">{DATE_MASK.slice(formData.date.length)}</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: formatEventDateInput(e.target.value) })}
                  className="relative w-full px-6 py-4 bg-transparent rounded-2xl outline-none font-bold tabular-nums !border-0 !shadow-none !bg-transparent"
                />
              </div>
              <p className={`text-[11px] ml-1 ${formData.date && !isValidEventDate(formData.date) && formData.date.length === DATE_MASK.length ? "text-rose-500" : "text-slate-400"}`}>
                {formData.date && !isValidEventDate(formData.date) && formData.date.length === DATE_MASK.length
                  ? "없는 날짜예요. 다시 확인해 주세요."
                  : "숫자 8자리만 입력하면 돼요 (예: 20260427 → 2026.04.27)"}
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
              className="w-full min-h-[400px] text-lg font-medium outline-none resize-none leading-relaxed placeholder:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
