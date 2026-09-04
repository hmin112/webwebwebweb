import { api } from "../../api/axios";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, PencilLine, AlertCircle,
  ImagePlus, Trash2, Wallet, Hash, Users, Plus, TrendingUp, TrendingDown, Scale
} from "lucide-react";
import { Button } from "../../components/ui/button";

type LedgerItem = { type: "입금" | "사용"; date: string; description: string; amount: string };

const emptyLedgerItem = (): LedgerItem => ({ type: "사용", date: "", description: "", amount: "" });

export const BoardWrite = ({ onNavigate, isAdmin, user, fetchPosts, post }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // ✨ images: UI 프리뷰용 (Base64 or URL)
  const [images, setImages] = useState<string[]>([]);
  // ✨ imageFiles: 서버 전송용 실제 파일 객체 저장
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [category, setCategory] = useState(isAdmin ? "회비" : "자유");
  const isFee = category === "회비";

  // ✨ 회비 = "회비 사용 내역" 게시글. 대상 학기 + 기존(이월) 금액 + 입금/사용 내역 목록으로
  // 엑셀 표처럼 한 줄씩 입력받아 최종 잔액을 자동 계산해서 보여준다.
  const [feeTerm, setFeeTerm] = useState("");
  const [feeOpeningBalance, setFeeOpeningBalance] = useState("");
  const [feeItems, setFeeItems] = useState<LedgerItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content || "");
      setCategory(post.category);
      setImages(post.images || []); // 기존 서버에 저장된 이미지 URL들
      setFeeTerm(post.feeTerm || "");
      setFeeOpeningBalance(post.feeOpeningBalance != null ? String(post.feeOpeningBalance) : "");
      setFeeItems(
        (post.feeItems || []).map((it: any) => ({
          type: it.type === "입금" ? "입금" : "사용",
          date: it.date || "",
          description: it.description || "",
          amount: it.amount != null ? String(it.amount) : "",
        }))
      );
    }
  }, [post]);

  // 카테고리를 회비에서 다른 카테고리로 바꾸면 회비 전용 입력값은 비워서 헷갈리지 않게 함
  useEffect(() => {
    if (!isFee) {
      setFeeTerm(""); setFeeOpeningBalance(""); setFeeItems([]);
    }
  }, [isFee]);

  useEffect(() => {
    if (post && post.loginId !== user?.loginId) {
      alert("본인 글만 수정할 수 있습니다.");
      onNavigate("board-detail", post.id);
    }
  }, [post, user?.loginId, onNavigate]);

  const categories = isAdmin ? ["회비", "자유", "질문"] : ["자유", "질문"];

  // ✨ 입력한 내역을 기준으로 실시간 합산 — 저장 전에도 미리 결과를 보여줌
  const feeSummary = useMemo(() => {
    const opening = Number(feeOpeningBalance) || 0;
    let income = 0;
    let expense = 0;
    feeItems.forEach((item) => {
      const amount = Number(item.amount) || 0;
      if (item.type === "입금") income += amount;
      else expense += amount;
    });
    return { opening, income, expense, final: opening + income - expense };
  }, [feeOpeningBalance, feeItems]);

  const addFeeItem = () => setFeeItems((prev) => [...prev, emptyLedgerItem()]);
  const removeFeeItem = (index: number) => setFeeItems((prev) => prev.filter((_, i) => i !== index));
  const updateFeeItem = (index: number, patch: Partial<LedgerItem>) =>
    setFeeItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

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

    if (isFee) {
      if (!title.trim() || !feeTerm.trim()) {
        alert("제목과 대상 학기는 필수로 입력해주세요.");
        return;
      }
      if (feeItems.some((item) => !item.description.trim() || !item.amount.trim())) {
        alert("추가한 내역에는 내용과 금액을 모두 입력해주세요. (빈 줄은 삭제해주세요)");
        return;
      }
    } else if (!title.trim() || !content.trim()) {
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
      if (isFee) {
        formData.append("feeTerm", feeTerm);
        formData.append("feeOpeningBalance", String(Number(feeOpeningBalance) || 0));
        formData.append(
          "feeItemsJson",
          JSON.stringify(feeItems.map((item) => ({ ...item, amount: Number(item.amount) || 0 })))
        );
      }

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
                placeholder={isFee ? "예: 2026년 2학기 회비 사용 내역" : "제목을 입력해주세요"}
                className="w-full px-5 py-4 md:px-8 md:py-6 bg-slate-50 rounded-[1.25rem] md:rounded-[2rem] border-none outline-none focus:ring-2 focus:ring-indigo-500 font-black text-sm md:text-xl text-slate-900 placeholder:text-slate-300 transition-all"
              />
            </div>

            {isFee && (
              <div className="space-y-4 md:space-y-6 p-4 md:p-8 bg-amber-50/50 rounded-[1.25rem] md:rounded-[2.5rem] border border-amber-100">
                <label className="text-[10px] md:text-xs font-black text-amber-700 uppercase ml-1 tracking-widest flex items-center gap-1.5 md:gap-2">
                  <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4" /> 회비 사용 내역
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
                  <div className="relative">
                    <Users className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                    <input
                      type="text"
                      value={feeTerm}
                      onChange={(e) => setFeeTerm(e.target.value)}
                      placeholder="대상 학기 (예: 2026년 2학기)"
                      className="w-full pl-11 md:pl-14 pr-4 py-3.5 md:py-5 bg-white rounded-xl md:rounded-2xl border border-amber-100 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-xs md:text-base text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                  <div className="relative">
                    <Scale className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                    <input
                      type="number"
                      value={feeOpeningBalance}
                      onChange={(e) => setFeeOpeningBalance(e.target.value)}
                      placeholder="기존(이월) 금액"
                      className="w-full pl-11 md:pl-14 pr-4 py-3.5 md:py-5 bg-white rounded-xl md:rounded-2xl border border-amber-100 outline-none focus:ring-2 focus:ring-amber-400 font-bold text-xs md:text-base text-slate-800 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* 엑셀 스타일 내역 표 */}
                <div className="rounded-xl md:rounded-2xl border border-amber-100 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-xs md:text-sm">
                      <thead>
                        <tr className="bg-amber-100/60 text-amber-700 text-[10px] md:text-xs font-black uppercase tracking-wider">
                          <th className="px-3 py-2.5 md:px-4 md:py-3 text-left w-20 md:w-24">구분</th>
                          <th className="px-3 py-2.5 md:px-4 md:py-3 text-left w-28 md:w-36">날짜</th>
                          <th className="px-3 py-2.5 md:px-4 md:py-3 text-left">내역</th>
                          <th className="px-3 py-2.5 md:px-4 md:py-3 text-right w-28 md:w-36">금액</th>
                          <th className="px-2 py-2.5 md:px-3 md:py-3 w-9"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-300 font-bold text-xs md:text-sm">
                              아래 "+ 내역 추가"로 입금/사용 내역을 한 줄씩 추가해주세요.
                            </td>
                          </tr>
                        )}
                        {feeItems.map((item, index) => (
                          <tr key={index} className="border-t border-amber-50">
                            <td className="px-2 py-1.5 md:px-3 md:py-2">
                              <select
                                value={item.type}
                                onChange={(e) => updateFeeItem(index, { type: e.target.value as "입금" | "사용" })}
                                className={`w-full px-1.5 py-1.5 md:px-2 md:py-2 rounded-lg border-none outline-none font-black text-[10px] md:text-xs cursor-pointer ${
                                  item.type === "입금" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                }`}
                              >
                                <option value="입금">입금</option>
                                <option value="사용">사용</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5 md:px-3 md:py-2">
                              <input
                                type="date"
                                value={item.date}
                                onChange={(e) => updateFeeItem(index, { date: e.target.value })}
                                className="w-full px-1.5 py-1.5 md:px-2 md:py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 font-bold text-[10px] md:text-xs text-slate-700"
                              />
                            </td>
                            <td className="px-2 py-1.5 md:px-3 md:py-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateFeeItem(index, { description: e.target.value })}
                                placeholder="예: 간식 구입"
                                className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 font-bold text-[11px] md:text-sm text-slate-800 placeholder:text-slate-300"
                              />
                            </td>
                            <td className="px-2 py-1.5 md:px-3 md:py-2">
                              <input
                                type="number"
                                value={item.amount}
                                onChange={(e) => updateFeeItem(index, { amount: e.target.value })}
                                placeholder="금액"
                                className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 font-bold text-[11px] md:text-sm text-slate-800 text-right placeholder:text-slate-300"
                              />
                            </td>
                            <td className="px-1 py-1.5 md:px-2 md:py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeFeeItem(index)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addFeeItem}
                  className="flex items-center gap-1.5 text-xs md:text-sm font-black text-amber-700 hover:text-amber-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> 내역 추가
                </button>

                {/* 자동 합산 요약 */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 md:pt-6 border-t border-amber-100">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">총 입금</span>
                    </div>
                    <p className="text-sm md:text-lg font-black text-slate-900">+{feeSummary.income.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-rose-500 mb-1">
                      <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">총 사용</span>
                    </div>
                    <p className="text-sm md:text-lg font-black text-slate-900">-{feeSummary.expense.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                      <Scale className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider">최종 잔액</span>
                    </div>
                    <p className="text-base md:text-xl font-black text-amber-700">{feeSummary.final.toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 md:space-y-4">
              <label className="text-[10px] md:text-xs font-black text-slate-400 uppercase ml-1 tracking-widest">
                {isFee ? "추가 안내사항 (선택)" : "상세 내용"}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={isFee ? "그 외 회비 관련 안내가 있다면 적어주세요." : "내용을 입력해주세요."}
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
