import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MonitorPlay, ChevronLeft, ChevronRight, X, Save, Plus, Trash2,
  Maximize, Minimize, Loader2, Megaphone, ListChecks, Users, Quote, CalendarClock, Clock,
} from "lucide-react";
import { api } from "../../../api/axios";
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
      <div className="flex items-center gap-2 md:gap-3 px-1 md:px-2 mb-2 text-slate-400 uppercase tracking-widest font-black text-[10px] md:text-xs">
        <MonitorPlay size={14} className="md:w-4 md:h-4" /> 총회 배너
      </div>

      <div className="flex items-center justify-center gap-4 md:gap-6 bg-white p-3 md:p-4 rounded-xl md:rounded-[2rem] border border-slate-100 shadow-sm w-fit mx-auto">
        <button onClick={() => setCurrentYear((y) => y - 1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400">
          <ChevronLeft size={18} />
        </button>
        <span className="text-lg md:text-xl font-black text-slate-900 tabular-nums w-20 text-center">{currentYear}년</span>
        <button onClick={() => setCurrentYear((y) => y + 1)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400">
          <ChevronRight size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
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
                className={`p-5 md:p-6 rounded-2xl md:rounded-[2rem] border shadow-sm text-left transition-all hover:shadow-md ${hasContent ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-900"}`}
              >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${hasContent ? "text-indigo-200" : "text-slate-400"}`}>{month}월</div>
                <div className="text-base md:text-lg font-black truncate">{banner?.title?.trim() || `${month}월 총회`}</div>
                <div className={`text-[10px] md:text-xs font-bold mt-2 ${hasContent ? "text-indigo-100" : "text-slate-300"}`}>
                  {hasContent ? "작성됨" : "미작성"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 편집 모달 */}
      <AnimatePresence>
        {editingMonth !== null && editorData && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center px-4 md:px-6 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={closeEditor} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">{currentYear}년 {editingMonth}월 총회 배너</h2>
                <button onClick={closeEditor} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X size={20} /></button>
              </div>

              <div className="space-y-6">
                <Field label="제목" placeholder={`${editingMonth}월 총회`}>
                  <input
                    value={editorData.title || ""}
                    onChange={(e) => setEditorData({ ...editorData, title: e.target.value })}
                    placeholder={`${editingMonth}월 총회`}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
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
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                  </Field>
                  <Field label="종료 목표 시각" icon={<Clock size={14} />}>
                    <input
                      type="time"
                      value={editorData.targetEndTime || ""}
                      onChange={(e) => setEditorData({ ...editorData, targetEndTime: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                  </Field>
                </div>

                <Field label="오늘의 한마디" icon={<Quote size={14} />}>
                  <input
                    value={editorData.quote || ""}
                    onChange={(e) => setEditorData({ ...editorData, quote: e.target.value })}
                    placeholder="예: 동아리방에서 꼭 정숙하기"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="다음 총회 안내" icon={<CalendarClock size={14} />}>
                    <input
                      value={editorData.nextAssemblyLabel || ""}
                      onChange={(e) => setEditorData({ ...editorData, nextAssemblyLabel: e.target.value })}
                      placeholder="예: 6월 총회"
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                  </Field>
                  <Field label="다음 총회 날짜">
                    <input
                      type="date"
                      value={editorData.nextAssemblyDate || ""}
                      onChange={(e) => setEditorData({ ...editorData, nextAssemblyDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    />
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={openFullscreen}
                  className="flex-1 flex items-center justify-center gap-2 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Maximize size={16} /> 전체화면으로 보기
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-base bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 저장
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 전체화면 뷰어 */}
      {isFullscreenOpen && editorData && (
        <div ref={fullscreenRef} className="fixed inset-0 z-[500] bg-[#f5f5f7] overflow-y-auto">
          <button
            onClick={closeFullscreen}
            className="fixed top-4 right-4 md:top-6 md:right-6 z-10 p-3 rounded-full bg-white/70 backdrop-blur-md shadow-md text-slate-600 hover:bg-white transition-all"
          >
            <Minimize size={18} />
          </button>
          <AssemblyBannerDisplay data={editorData} />
        </div>
      )}
    </motion.div>
  );
};

const Field = ({ label, icon, placeholder, children }: { label: string; icon?: React.ReactNode; placeholder?: string; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
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
    <label className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
      {icon} {label}
    </label>
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
          />
          <button onClick={() => onRemove(i)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all shrink-0">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all">
        <Plus size={14} /> 항목 추가
      </button>
    </div>
  </div>
);
