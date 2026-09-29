import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, Save, Plus, Trash2,
  Maximize, Minimize, Loader2, Megaphone, ListChecks, Users, Quote, CalendarClock, Clock,
} from "lucide-react";
import { api } from "../../../api/axios";
import { PageHeader } from "../assemblyUi";
import { AssemblyBannerDisplay, type AssemblyBannerData } from "../components/AssemblyBannerDisplay";

const ACTIVE_MONTHS = [3, 4, 5, 6, 9, 10, 11, 12];

const emptyBanner = (year: number, month: number): AssemblyBannerData => ({
  year, month, title: "", notices: [], agenda: [], attendanceCount: null,
  quote: "", targetEndTime: "", nextAssemblyLabel: "", nextAssemblyDate: "",
});

export const AssemblyBannerAdminTab = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [banners, setBanners] = useState<AssemblyBannerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editorData, setEditorData] = useState<AssemblyBannerData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchBanners(currentYear);
  }, [currentYear]);

  const fetchBanners = async (year: number) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/assembly-banners/${year}`);
      setBanners(res.data || []);
    } catch (e) {
      console.error("총회 배너 목록 로드 실패", e);
      setBanners(ACTIVE_MONTHS.map((m) => emptyBanner(year, m)));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditor = (month: number) => {
    const existing = banners.find((b) => b.month === month);
    setEditorData(existing ? { ...existing } : emptyBanner(currentYear, month));
    setEditingMonth(month);
  };

  const closeEditor = () => {
    setEditingMonth(null);
    setEditorData(null);
  };

  const handleSave = async () => {
    if (!editorData || editingMonth === null) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/admin/assembly-banners/${currentYear}/${editingMonth}`, {
        title: editorData.title || null,
        notices: editorData.notices.filter((n) => n.trim()),
        agenda: editorData.agenda.filter((a) => a.trim()),
        attendanceCount: editorData.attendanceCount,
        quote: editorData.quote || null,
        targetEndTime: editorData.targetEndTime || null,
        nextAssemblyLabel: editorData.nextAssemblyLabel || null,
        nextAssemblyDate: editorData.nextAssemblyDate || null,
      });
      setBanners((prev) => {
        const next = prev.filter((b) => b.month !== editingMonth);
        next.push(res.data);
        return next.sort((a, b) => a.month - b.month);
      });
      setEditorData(res.data);
      alert("저장되었습니다.");
    } catch (e) {
      console.error("총회 배너 저장 실패", e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const openFullscreen = () => {
    setIsFullscreenOpen(true);
  };

  useEffect(() => {
    if (isFullscreenOpen && fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen?.().catch(() => {});
    }
  }, [isFullscreenOpen]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreenOpen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const closeFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    setIsFullscreenOpen(false);
  };

  const updateList = (field: "notices" | "agenda", index: number, value: string) => {
    if (!editorData) return;
    const list = [...editorData[field]];
    list[index] = value;
    setEditorData({ ...editorData, [field]: list });
  };
  const addListItem = (field: "notices" | "agenda") => {
    if (!editorData) return;
    setEditorData({ ...editorData, [field]: [...editorData[field], ""] });
  };
  const removeListItem = (field: "notices" | "agenda", index: number) => {
    if (!editorData) return;
    setEditorData({ ...editorData, [field]: editorData[field].filter((_, i) => i !== index) });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 md:space-y-8">
      {/* ✨ [2026-09-30] 애플 스타일 머리말 */}
      <PageHeader
        title="총회 배너"
        desc="달마다 총회 화면에 띄울 배너를 만들고, 전체 화면으로 발표해요."
        right={
          <div className="flex items-center gap-1 bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] h-10 px-1.5 rounded-full">
            <button onClick={() => setCurrentYear((y) => y - 1)} aria-label="이전 연도" className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-black/[0.05]"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-[#1D1D1F] w-14 text-center tabular-nums">{currentYear}년</span>
            <button onClick={() => setCurrentYear((y) => y + 1)} aria-label="다음 연도" className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-black/[0.05]"><ChevronRight size={16} /></button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8E8E93]">
          <Loader2 className="animate-spin mb-4" size={28} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {ACTIVE_MONTHS.map((month) => {
            const banner = banners.find((b) => b.month === month);
            const hasContent = !!(banner && (banner.title || banner.notices.length || banner.agenda.length));
            return (
              <button
                key={month}
                onClick={() => openEditor(month)}
                className="p-4 md:p-5 rounded-3xl text-left bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] hover:shadow-[0_8px_24px_rgb(0_0_0/0.06)] transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-[#1D1D1F]">{month}<span className="text-sm text-[#8E8E93] font-semibold">월</span></span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${hasContent ? "bg-[#34C759]/10 text-[#248A3D]" : "bg-black/[0.05] text-[#8E8E93]"}`}>
                    {hasContent ? "작성됨" : "미작성"}
                  </span>
                </div>
                <div className={`text-sm md:text-[15px] font-semibold truncate ${hasContent ? "text-[#1D1D1F]" : "text-[#AEAEB2]"}`}>{banner?.title?.trim() || `${month}월 총회`}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* 편집 모달 */}
      <AnimatePresence>
        {editingMonth !== null && editorData && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-4 md:px-6 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeEditor} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#fff] w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-lg md:text-2xl font-bold text-[#1D1D1F] tracking-tight">{currentYear}년 {editingMonth}월 총회 배너</h2>
                <button onClick={closeEditor} className="p-2 rounded-xl hover:bg-black/[0.04] text-[#8E8E93]"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <Field label="제목" placeholder={`${editingMonth}월 총회`}>
                  <input
                    value={editorData.title || ""}
                    onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                    placeholder={`${editingMonth}월 총회`}
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                  />
                </Field>

                <ListField
                  icon={<Megaphone size={14} />}
                  label="공지사항"
                  items={editorData.notices}
                  onChange={(i, v) => updateList("notices", i, v)}
                  onAdd={() => addListItem("notices")}
                  onRemove={(i) => removeListItem("notices", i)}
                  placeholder="공지 내용을 입력하세요"
                />

                <ListField
                  icon={<ListChecks size={14} />}
                  label="오늘의 안건"
                  items={editorData.agenda}
                  onChange={(i, v) => updateList("agenda", i, v)}
                  onAdd={() => addListItem("agenda")}
                  onRemove={(i) => removeListItem("agenda", i)}
                  placeholder="안건 내용을 입력하세요"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="참석 인원" icon={<Users size={14} />}>
                    <input
                      type="number"
                      value={editorData.attendanceCount ?? ""}
                      onChange={(e) => setEditorData({ ...editorData, attendanceCount: e.target.value === "" ? null : Number(e.target.value) })}
                      placeholder="예: 33"
                      className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                    />
                  </Field>
                  <Field label="종료 목표 시각" icon={<Clock size={14} />}>
                    <input
                      type="time"
                      value={editorData.targetEndTime || ""}
                      onChange={(e) => setEditorData({ ...editorData, targetEndTime: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                    />
                  </Field>
                </div>

                <Field label="오늘의 한마디" icon={<Quote size={14} />}>
                  <input
                    value={editorData.quote || ""}
                    onChange={(e) => setEditorData({ ...editorData, quote: e.target.value })}
                    placeholder="예: 동아리방에서 꼭 정숙하기"
                    className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="다음 총회 안내" icon={<CalendarClock size={14} />}>
                    <input
                      value={editorData.nextAssemblyLabel || ""}
                      onChange={(e) => setEditorData({ ...editorData, nextAssemblyLabel: e.target.value })}
                      placeholder="예: 6월 총회"
                      className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                    />
                  </Field>
                  <Field label="다음 총회 날짜">
                    <input
                      type="date"
                      value={editorData.nextAssemblyDate || ""}
                      onChange={(e) => setEditorData({ ...editorData, nextAssemblyDate: e.target.value })}
                      className="w-full px-4 py-3 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={openFullscreen}
                  className="flex-1 flex items-center justify-center gap-2 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base bg-[#F5F5F7] text-[#3A3A3C] hover:bg-black/[0.06] transition-all"
                >
                  <Maximize size={16} /> 전체화면으로 보기
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold text-sm md:text-base bg-[#0071E3] text-white hover:bg-[#0077ED] transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 저장
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 전체화면 뷰어 — document.body에 포털로 렌더링해서, 사이드바를 감싸는 조상 요소(motion.div 등)가
          만드는 CSS containing block에 fixed 포지션이 갇히지 않고 진짜 뷰포트 전체를 덮도록 함 */}
      {isFullscreenOpen && editorData && createPortal(
        <div ref={fullscreenRef} className="fixed inset-0 z-[9999] bg-[#f5f5f7] overflow-y-auto">
          <button
            onClick={closeFullscreen}
            className="fixed top-4 right-4 md:top-6 md:right-6 z-10 p-3 rounded-full bg-[#fff]/70 backdrop-blur-md shadow-md text-[#3A3A3C] hover:bg-[#fff] transition-all"
          >
            <Minimize size={18} />
          </button>
          <AssemblyBannerDisplay data={editorData} />
        </div>,
        document.body
      )}
    </motion.div>
  );
};

const Field = ({ label, icon, placeholder, children }: { label: string; icon?: React.ReactNode; placeholder?: string; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-[#8E8E93] uppercase tracking-wide mb-2">
      {icon} {label}
    </label>
    {children}
  </div>
);

const ListField = ({ icon, label, items, onChange, onAdd, onRemove, placeholder }: {
  icon: React.ReactNode; label: string; items: string[];
  onChange: (i: number, v: string) => void; onAdd: () => void; onRemove: (i: number) => void; placeholder: string;
}) => (
  <div>
    <label className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-[#8E8E93] uppercase tracking-wide mb-2">
      {icon} {label}
    </label>
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2.5 bg-[#F5F5F7] rounded-xl outline-none focus:ring-2 focus:ring-[#0071E3]/30 font-bold text-sm"
          />
          <button onClick={() => onRemove(i)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0071E3]/10 text-[#0071E3] rounded-xl font-bold text-xs hover:bg-[#0071E3]/15 transition-all">
        <Plus size={14} /> 항목 추가
      </button>
    </div>
  </div>
);
