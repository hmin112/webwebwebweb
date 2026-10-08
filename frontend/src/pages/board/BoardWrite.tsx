import { api } from "../../api/axios";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ImagePlus, Trash2, Wallet, Plus, Loader2, X } from "lucide-react";
import { FileDropZone } from "../../components/ui/FileDropZone";
import { FEE } from "./feeTheme";
import { CategorySegment } from "./CategorySegment";

// ✨ [2026-10-08] 게시판 글쓰기 — 지금 웹(애플 스타일)과 같은 흰 카드·회색 입력칸으로 다시 정리.
// 회비 글은 "회비 사용 내역": 대상 학기 + 이월 금액 + 입금/사용 내역을 한 줄씩 넣으면 최종 잔액을 바로 계산해 보여준다.

type LedgerItem = { type: "입금" | "사용"; date: string; description: string; amount: string };

const emptyLedgerItem = (): LedgerItem => ({ type: "사용", date: "", description: "", amount: "" });
const digits = (v: string) => v.replace(/[^\d]/g, "");
const won = (v: string) => (v ? Number(v).toLocaleString() : "");

export const BoardWrite = ({ onNavigate, isAdmin, user, fetchPosts, post }: any) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // images: 화면 미리보기용(Base64 또는 URL), imageFiles: 서버로 보낼 실제 파일
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [category, setCategory] = useState(isAdmin ? "회비" : "자유");
  const isFee = category === "회비";

  const [feeTerm, setFeeTerm] = useState("");
  const [feeOpeningBalance, setFeeOpeningBalance] = useState("");
  const [feeItems, setFeeItems] = useState<LedgerItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // state 반영보다 빠른 연속 클릭도 즉시 차단한다.
  const submitLockRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content || "");
      setCategory(post.category);
      setImages(post.images || []);
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

  // 입력한 내역으로 실시간 합산 — 저장 전에도 결과를 보여줌
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    setImageFiles((prev) => [...prev, ...fileArray]);
    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
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

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
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
      imageFiles.forEach((file) => formData.append("files", file));
      // 수정 시 기존 이미지(URL)는 유지
      const existingImages = images.filter((img) => img.startsWith("http"));
      formData.append("existingImages", JSON.stringify(existingImages));

      if (post) {
        await api.put(`/posts/${post.id}`, formData);
        alert("게시글이 수정되었습니다.");
      } else {
        await api.post("/posts", formData);
        alert("게시글이 등록되었습니다.");
      }

      if (fetchPosts) await fetchPosts();
      onNavigate("board-page");
    } catch (error) {
      console.error("게시글 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  return (
    <div className="write-page min-h-screen pt-24 md:pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* 머리 */}
        <button
          onClick={() => onNavigate("board-page")}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition-colors group mb-4"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 게시판
        </button>
        <div className="flex items-end justify-between gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-[30px] md:text-[40px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight">
              {post ? "글 수정" : "새 글"}
            </h1>
            <p className="text-[14px] md:text-[15px] text-[#6E6E73] mt-1">
              {isFee ? "회비 입금·사용 내역을 한 줄씩 넣으면 잔액이 자동으로 계산돼요." : "부원들과 나누고 싶은 이야기를 적어주세요."}
            </p>
          </div>
        </div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#fff] rounded-[28px] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_rgb(0_0_0/0.05)] p-5 md:p-9 space-y-7"
        >
          {/* 카테고리 — 세그먼트 */}
          <div>
            <Label>카테고리</Label>
            <CategorySegment options={categories} value={category} onChange={setCategory} layoutId="boardWriteCategory" variant="solid" />
          </div>

          {/* 제목 */}
          <div>
            <Label>제목</Label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFee ? "예: 2026년 2학기 회비 사용 내역" : "제목을 입력해주세요"}
              className="w-full h-14 px-5 rounded-2xl text-[17px] font-semibold outline-none"
            />
          </div>

          {/* 회비 사용 내역 */}
          <AnimatePresence initial={false}>
            {isFee && (
              <motion.div
                key="fee"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-[22px] p-4 md:p-6" style={{ backgroundColor: FEE.wash }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-8 h-8 rounded-[10px] flex items-center justify-center bg-[#fff] shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.05)]" style={{ color: FEE.accent }}>
                      <Wallet size={16} />
                    </span>
                    <span className="text-[16px] font-bold text-[#1D1D1F]">회비 사용 내역</span>
                  </div>

                  <div className="field-white grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div>
                      <Label small>대상 학기</Label>
                      <input
                        type="text"
                        value={feeTerm}
                        onChange={(e) => setFeeTerm(e.target.value)}
                        placeholder="예: 2026년 2학기"
                        className="w-full h-12 px-4 rounded-xl text-[15px] font-semibold outline-none"
                      />
                    </div>
                    <div>
                      <Label small>이월 금액</Label>
                      <div className="relative">
                        <input
                          inputMode="numeric"
                          value={won(feeOpeningBalance)}
                          onChange={(e) => setFeeOpeningBalance(digits(e.target.value))}
                          placeholder="0"
                          className="w-full h-12 pl-4 pr-10 rounded-xl text-[15px] font-semibold tabular-nums text-right outline-none"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#8E8E93] pointer-events-none">원</span>
                      </div>
                    </div>
                  </div>

                  {/* 내역 — 한 줄씩 */}
                  <div className="flex items-center justify-between mb-2">
                    <Label small noMargin>내역 {feeItems.length > 0 && <span className="text-[#8E8E93] font-medium">{feeItems.length}건</span>}</Label>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {feeItems.map((item, index) => (
                        <motion.div
                          key={index}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          className="rounded-2xl bg-[#fff] border border-black/[0.06] p-2.5 md:p-3 grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_148px_minmax(0,1fr)_140px_auto] items-center gap-2"
                        >
                          {/* 입금/사용 */}
                          <div className="inline-flex p-0.5 rounded-full bg-black/[0.05] shrink-0">
                            {(["입금", "사용"] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => updateFeeItem(index, { type: t })}
                                className={`h-8 px-3 rounded-full text-[13px] font-semibold transition-all ${item.type === t ? "bg-[#fff] shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#8E8E93]"}`}
                                style={item.type === t ? { color: t === "입금" ? FEE.income : FEE.expense } : undefined}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateFeeItem(index, { date: e.target.value })}
                            className="hidden md:block w-full h-10 px-3 rounded-xl text-[14px] tabular-nums outline-none"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateFeeItem(index, { description: e.target.value })}
                            placeholder="내용 (예: 간식 구입)"
                            className="w-full h-10 px-3 rounded-xl text-[14px] outline-none"
                          />
                          <div className="relative hidden md:block">
                            <input
                              inputMode="numeric"
                              value={won(item.amount)}
                              onChange={(e) => updateFeeItem(index, { amount: digits(e.target.value) })}
                              placeholder="금액"
                              className="w-full h-10 pl-3 pr-8 rounded-xl text-[14px] font-semibold tabular-nums text-right outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8E8E93] pointer-events-none">원</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFeeItem(index)}
                            aria-label="내역 삭제"
                            className="w-9 h-9 rounded-full text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] flex items-center justify-center transition-colors"
                          >
                            <X size={16} />
                          </button>
                          {/* 휴대폰: 날짜·금액은 둘째 줄 */}
                          <div className="md:hidden col-span-3 grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => updateFeeItem(index, { date: e.target.value })}
                              className="w-full h-10 px-3 rounded-xl text-[14px] tabular-nums outline-none"
                            />
                            <div className="relative">
                              <input
                                inputMode="numeric"
                                value={won(item.amount)}
                                onChange={(e) => updateFeeItem(index, { amount: digits(e.target.value) })}
                                placeholder="금액"
                                className="w-full h-10 pl-3 pr-8 rounded-xl text-[14px] font-semibold tabular-nums text-right outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8E8E93] pointer-events-none">원</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <button
                      type="button"
                      onClick={addFeeItem}
                      className="w-full h-12 rounded-2xl border border-dashed border-black/[0.12] text-[14px] font-semibold text-[#0071E3] inline-flex items-center justify-center gap-1.5 hover:bg-[#fff] transition-colors"
                    >
                      <Plus size={16} /> 내역 추가
                    </button>
                  </div>

                  {/* 합계 */}
                  <div className="mt-5 rounded-2xl bg-[#fff] border border-black/[0.06] p-4 md:p-5">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="이월" value={feeSummary.opening} />
                      <Stat label="입금" value={feeSummary.income} sign="+" color={FEE.income} />
                      <Stat label="사용" value={feeSummary.expense} sign="−" color={FEE.expense} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-black/[0.06] flex items-baseline justify-between">
                      <span className="text-[14px] font-semibold text-[#6E6E73]">최종 잔액</span>
                      <span className="text-[26px] md:text-[30px] font-bold tracking-[-0.02em] tabular-nums" style={{ color: feeSummary.final < 0 ? FEE.expense : "#1D1D1F" }}>
                        {feeSummary.final.toLocaleString()}<span className="text-[17px] font-semibold text-[#8E8E93] ml-0.5">원</span>
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 내용 */}
          <div>
            <Label>{isFee ? "추가 안내 (선택)" : "내용"}</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isFee ? "그 외 회비 관련 안내가 있다면 적어주세요." : "내용을 입력해주세요."}
              className="w-full px-5 py-4 rounded-2xl text-[15px] leading-relaxed outline-none resize-y min-h-[180px] md:min-h-[240px]"
            />
          </div>

          {/* 사진 */}
          <div>
            <Label>사진 {images.length > 0 && <span className="text-[#8E8E93] font-medium">{images.length}</span>}</Label>
            <FileDropZone inputRef={fileInputRef} label="사진을 놓으면 추가돼요">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div
                      key={img.slice(-40) + index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-2xl overflow-hidden bg-[#F5F5F7] group"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label="사진 빼기"
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/55 backdrop-blur text-white flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border border-dashed border-black/[0.12] flex flex-col items-center justify-center gap-1.5 text-[#8E8E93] hover:text-[#0071E3] hover:border-[#0071E3]/40 hover:bg-[#0071E3]/[0.03] transition-colors"
                >
                  <ImagePlus size={22} />
                  <span className="text-[12px] font-semibold">사진 추가</span>
                </button>
              </div>
            </FileDropZone>
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigate("board-page")}
              className="h-12 px-6 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {post ? "수정 완료" : "등록하기"}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const Label = ({ children, small, noMargin }: { children: React.ReactNode; small?: boolean; noMargin?: boolean }) => (
  <label className={`block ${small ? "text-[12px]" : "text-[13px]"} font-semibold text-[#6E6E73] ${noMargin ? "" : "mb-2"} ml-1`}>{children}</label>
);

const Stat = ({ label, value, sign = "", color = "#1D1D1F" }: { label: string; value: number; sign?: string; color?: string }) => (
  <div>
    <p className="text-[12px] font-semibold text-[#8E8E93] mb-0.5">{label}</p>
    <p className="text-[16px] md:text-[18px] font-bold tabular-nums" style={{ color }}>
      {value ? sign : ""}{value.toLocaleString()}
    </p>
  </div>
);
