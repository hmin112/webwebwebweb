import { api } from "../../../api/axios";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, Download, Eye, FileDown, FileText, FileUp, Loader2, Trash2, X,
} from "lucide-react";

// ✨ [2026-09-29 신규] 계획서(개인/팀)를 파일로 올리는 카드. 원본 파일은 첨부로 보관되고,
// 서버가 "■ 항목 제목" 양식 기준으로 뽑아낸 내용은 onUploaded로 넘겨 아래 작성 폼에 채운다.

export type ExtractedPlan = {
  projectTitle: string;
  planOverview: string;
  planGoals: string[];
  planRoadmapItems: { title: string; startDate: string; endDate: string; detail: string }[];
  planRoles: { loginId: string | null; name: string; role: string; duties: string }[];
  planLinks: { label: string; url: string }[];
  planNotes: string;
};

export type PlanFileUploadResult = {
  submission: any;
  extracted: ExtractedPlan;
  templateRecognized: boolean;
  warnings: string[];
};

const ACCEPT = ".pdf,.docx,.hwp,.hwpx,.pptx";
const ALLOWED = ["pdf", "docx", "hwp", "hwpx", "pptx"];

export const planFileDisplayName = (path?: string | null) => {
  if (!path) return "";
  const base = path.split(/[\\/]/).pop() || path;
  return base.replace(/^plan_[0-9a-f]{32}_/, "");
};

const extensionOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "");

const filenameFromDisposition = (header: string | undefined, fallback: string) => {
  if (!header) return fallback;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const plain = header.match(/filename="?([^"]+)"?/i);
  return plain?.[1] || fallback;
};

const saveBlob = (data: BlobPart, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadPlanFile = async (path: string) => {
  const res = await api.get("/assembly/download", { params: { path }, responseType: "blob" });
  saveBlob(res.data, filenameFromDisposition(res.headers["content-disposition"], planFileDisplayName(path) || "계획서"));
};

export const PlanFileUploader = ({
  disabled,
  planFilePath,
  uploadUrl,
  buildParams,
  team,
  onUploaded,
  onRemoved,
}: {
  disabled: boolean;
  planFilePath?: string | null;
  uploadUrl: string;
  buildParams: () => Record<string, string | number>;
  team: boolean;
  onUploaded: (result: PlanFileUploadResult) => { filledCount: number; applied: boolean };
  onRemoved: (submission: any) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "warn"; title: string; warnings: string[] } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileName = planFileDisplayName(planFilePath);
  const isPdf = extensionOf(fileName) === "pdf";

  const upload = async (file: File) => {
    if (disabled || uploading) return;
    if (!ALLOWED.includes(extensionOf(file.name))) {
      alert("PDF, Word(.docx), 한글(.hwp/.hwpx), PowerPoint(.pptx) 파일만 올릴 수 있어요.\n(.doc, .ppt 같은 예전 형식은 새 형식으로 다시 저장해서 올려주세요.)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("계획서 파일은 50MB 이하만 올릴 수 있어요.");
      return;
    }
    const form = new FormData();
    Object.entries(buildParams()).forEach(([k, v]) => form.append(k, String(v)));
    form.append("file", file);

    setUploading(true);
    setFeedback(null);
    try {
      const res = await api.post(uploadUrl, form, { headers: { "Content-Type": "multipart/form-data" } });
      const result: PlanFileUploadResult = res.data;
      const { filledCount, applied } = onUploaded(result);
      if (!result.templateRecognized) {
        setFeedback({ tone: "warn", title: "파일은 첨부됐지만 양식을 인식하지 못했어요", warnings: result.warnings });
      } else if (!applied) {
        setFeedback({ tone: "ok", title: "파일만 첨부했어요 (작성 칸은 그대로 두었어요)", warnings: [] });
      } else if (filledCount === 0) {
        setFeedback({ tone: "warn", title: "파일은 첨부됐지만 채울 내용을 찾지 못했어요", warnings: result.warnings });
      } else {
        setFeedback({
          tone: result.warnings.length > 0 ? "warn" : "ok",
          title: `파일에서 ${filledCount}개 항목을 채웠어요 — 아래 내용을 확인한 뒤 제출해주세요`,
          warnings: result.warnings,
        });
      }
    } catch (e: any) {
      alert(`업로드 실패: ${e.response?.data?.message || e.message}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (disabled || removing || !planFilePath) return;
    if (!window.confirm("첨부한 계획서 파일을 삭제할까요?\n(아래 작성 칸의 내용은 그대로 유지돼요)")) return;
    setRemoving(true);
    try {
      const res = await api.delete(uploadUrl, { params: buildParams() });
      onRemoved(res.data);
      setFeedback(null);
    } catch (e: any) {
      alert(`삭제 실패: ${e.response?.data?.message || e.message}`);
    } finally {
      setRemoving(false);
    }
  };

  const download = async () => {
    if (!planFilePath) return;
    try {
      await downloadPlanFile(planFilePath);
    } catch {
      alert("파일을 내려받지 못했어요.");
    }
  };

  const preview = async () => {
    if (!planFilePath) return;
    try {
      const res = await api.get("/assembly/download", { params: { path: planFilePath }, responseType: "blob" });
      setPreviewUrl(window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })));
    } catch {
      alert("미리보기를 불러오지 못했어요.");
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/assembly/plan/template", { params: { team }, responseType: "blob" });
      saveBlob(res.data, filenameFromDisposition(res.headers["content-disposition"], "DEVSIGN_계획서_양식.docx"));
    } catch {
      alert("양식을 내려받지 못했어요.");
    }
  };

  return (
    <div className="mb-6 bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <FileUp size={14} className="text-indigo-500" />
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">파일로 올리기 (선택)</p>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
            PDF · Word(.docx) · 한글(.hwp/.hwpx) · PowerPoint(.pptx)
            <br className="hidden sm:block" />
            <span className="sm:hidden"> — </span>양식대로 작성한 파일을 올리면 아래 작성 칸이 자동으로 채워져요.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="self-start flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0"
        >
          <FileDown size={14} /> 양식 내려받기 (.docx)
        </button>
      </div>

      {planFilePath && (
        <div className="flex items-center justify-between gap-3 p-3 md:p-3.5 mb-3 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-bold text-slate-800 truncate">{fileName}</p>
              <p className="text-[10px] font-bold text-slate-400">첨부된 계획서 원본</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPdf && (
              <button onClick={preview} className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                <Eye size={13} /> <span className="hidden sm:inline">보기</span>
              </button>
            )}
            <button onClick={download} className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors">
              <Download size={13} /> <span className="hidden sm:inline">다운로드</span>
            </button>
            {!disabled && (
              <button onClick={remove} disabled={removing} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-white transition-colors disabled:opacity-50">
                {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>
      )}

      {!disabled && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          className={`flex items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-xs md:text-sm font-bold ${
            dragOver ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500"
          }`}
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> 파일을 읽는 중...</>
          ) : (
            <><FileUp size={16} /> {planFilePath ? "다른 파일로 바꾸기" : "파일을 끌어다 놓거나 눌러서 선택"}</>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </div>
      )}

      {feedback && (
        <div className={`mt-3 p-3.5 rounded-xl border text-xs ${feedback.tone === "ok" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-amber-50 border-amber-100 text-amber-700"}`}>
          <div className="flex items-start gap-2">
            {feedback.tone === "ok" ? <CheckCircle2 size={15} className="shrink-0 mt-px" /> : <AlertTriangle size={15} className="shrink-0 mt-px" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{feedback.title}</p>
              {feedback.warnings.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 font-medium list-disc pl-4">
                  {feedback.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </div>
            <button onClick={() => setFeedback(null)} className="shrink-0 opacity-50 hover:opacity-100"><X size={13} /></button>
          </div>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {previewUrl && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-2 md:p-10">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={closePreview} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-5xl bg-white h-full rounded-2xl md:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <span className="font-black text-slate-900 text-sm md:text-base truncate">{fileName}</span>
                  <button onClick={closePreview} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100"><X size={16} /></button>
                </div>
                <iframe src={previewUrl} className="flex-1 w-full border-none bg-slate-100" title="계획서 미리보기" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// 추출 결과를 작성 폼 상태에 합친다 — 파일에서 읽힌 항목만 덮어쓰고, 비어 있는 항목은 기존 값을 유지.
// 역할은 이름이 같은 팀원이 있으면 프로필(loginId)을 연결하고, 파일에 없는 팀원은 뒤에 빈 칸으로 남겨둔다.
export type PlanFormLike = {
  planOverview: string;
  planGoals: string[];
  planRoadmapItems: { title: string; startDate: string; endDate: string; detail: string }[];
  planRoles: { loginId: string; name: string; role: string; duties: string }[];
  planLinks: Record<string, string>[];
  planNotes: string;
  memo?: string;
};

export function mergeExtractedPlan<S extends PlanFormLike>(
  prev: S, ex: ExtractedPlan, teamMembers: any[], minGoals: number
): { next: S; filledCount: number } {
  const next: PlanFormLike = { ...prev };
  let filled = 0;

  if ("memo" in prev && ex.projectTitle?.trim()) {
    next.memo = ex.projectTitle.trim();
    filled++;
  }
  if (ex.planOverview?.trim()) {
    next.planOverview = ex.planOverview;
    filled++;
  }
  if (ex.planGoals?.length) {
    const goals = [...ex.planGoals];
    while (goals.length < minGoals) goals.push("");
    next.planGoals = goals;
    filled++;
  }
  if (ex.planRoadmapItems?.length) {
    next.planRoadmapItems = ex.planRoadmapItems.map((r) => ({
      title: r.title || "",
      startDate: r.startDate || "",
      endDate: r.endDate || "",
      detail: r.detail || "",
    }));
    filled++;
  }
  if (ex.planRoles?.length) {
    // ✨ [2026-09-30] 간부진은 이름이 "김형민(회장)"처럼 직책이 괄호로 붙어 있어서, 파일에 "22 김형민"이라고 쓰면 연결되지 않았다 —
    // 양쪽 모두 괄호 부분과 띄어쓰기를 빼고 비교한다.
    const baseName = (s: string) => (s || "").replace(/\([^)]*\)|（[^）]*）/g, "").replace(/\s/g, "");
    const used = new Set<string>();
    const roles = ex.planRoles.map((r) => {
      const member = teamMembers.find((m: any) => !used.has(m.loginId) && baseName(m.name) && baseName(r.name).includes(baseName(m.name)));
      if (member) used.add(member.loginId);
      return { loginId: member?.loginId || "", name: member?.name || r.name || "", role: r.role || "", duties: r.duties || "" };
    });
    teamMembers
      .filter((m: any) => !used.has(m.loginId))
      .forEach((m: any) => roles.push({ loginId: m.loginId, name: m.name, role: "", duties: "" }));
    next.planRoles = roles;
    filled++;
  }
  if (ex.planLinks?.length) {
    const links = prev.planLinks.map((l) => ({ label: l.label || "", url: l.url || "" }));
    ex.planLinks.forEach((l) => {
      const slot = links.find((x) => !x.url.trim() && x.label.trim().toLowerCase() === l.label.trim().toLowerCase());
      if (slot) slot.url = l.url;
      else if (!links.some((x) => x.url.trim() === l.url.trim())) links.push({ label: l.label, url: l.url });
    });
    next.planLinks = links;
    filled++;
  }
  if (ex.planNotes?.trim()) {
    next.planNotes = ex.planNotes;
    filled++;
  }
  return { next: next as S, filledCount: filled };
}

export const hasPlanContent = (s: { planOverview: string; planGoals: string[]; planRoadmapItems: any[]; planNotes: string }) =>
  Boolean(s.planOverview.trim() || s.planGoals.some((g) => g.trim()) || s.planRoadmapItems.length > 0 || s.planNotes.trim());
