import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Check, ChevronRight, FileText, KeyRound, Loader2, Minus, MessagesSquare, Plus, Printer, RotateCcw, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../../api/axios";
import { FileDropZone } from "../../components/ui/FileDropZone";

// ✨ [2026-10-01 신규] 웹 인쇄 — 파일을 올리면 미리보기(PDF가 아니면 서버에서 PDF로 바꿔 보여줌), 매수를 고르고 인쇄를 누르면
// 대기열에 들어가 동아리방 프린터 PC의 쿵프린타 봇이 가져가 인쇄한다. 진행 상태는 몇 초마다 새로 읽는다.

type Job = {
  id: number;
  fileName: string;
  extension: string;
  pageCount: number | null;
  copies: number;
  status: "DRAFT" | "QUEUED" | "PRINTING" | "DONE" | "FAILED" | "CANCELED";
  errorMessage: string | null;
  createdAt: string;
  queuedAt: string | null;
  finishedAt: string | null;
  queuePosition: number;
  previewReady: boolean;
  formKey: string | null;
};

type PrintForm = { key: string; name: string; color: string; available: boolean };

// 양식별 아이콘과 한 줄 설명 (색은 서버가 주는 디스코드 버튼 색을 아이콘에만 옅게 쓴다)
const FORM_META: Record<string, { icon: LucideIcon; hint: string }> = {
  attendance: { icon: CalendarCheck, hint: "결석 출석 인정 신청" },
  counseling: { icon: MessagesSquare, hint: "지도교수 상담 기록" },
  rental: { icon: KeyRound, hint: "시설물 대여 신청" },
};

const ACCEPT = ".pdf,.ppt,.pptx,.hwp,.hwpx,.doc,.docx";
const MAX_COPIES = 10;

const STATUS_LABEL: Record<Job["status"], { label: string; color: string }> = {
  DRAFT: { label: "미리보기", color: "#8E8E93" },
  QUEUED: { label: "대기 중", color: "#FF9F0A" },
  PRINTING: { label: "인쇄 중", color: "#0A84FF" },
  DONE: { label: "인쇄 완료", color: "#34C759" },
  FAILED: { label: "실패", color: "#FF3B30" },
  CANCELED: { label: "취소됨", color: "#AEAEB2" },
};

const fmtTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const PrintPage = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copies, setCopies] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Job[]>([]);
  const [printer, setPrinter] = useState<{ online: boolean; queued: number } | null>(null);
  const [forms, setForms] = useState<PrintForm[]>([]);
  const [startingForm, setStartingForm] = useState<string | null>(null);

  const loadHistory = () => api.get("/print/jobs/mine").then((r) => setHistory(r.data || [])).catch(() => {});
  const loadStatus = () => api.get("/print/status").then((r) => setPrinter(r.data)).catch(() => {});

  useEffect(() => {
    loadHistory();
    loadStatus();
    api.get("/print/forms").then((r) => setForms(r.data || [])).catch(() => {});
    const t = setInterval(() => { loadStatus(); loadHistory(); }, 5000);
    return () => clearInterval(t);
  }, []);

  // 인쇄를 요청한 작업은 끝날 때까지 3초마다 상태를 새로 읽는다
  useEffect(() => {
    if (!job || (job.status !== "QUEUED" && job.status !== "PRINTING")) return;
    const t = setInterval(async () => {
      const r = await api.get("/print/jobs/mine").catch(() => null);
      if (!r) return;
      setHistory(r.data || []);
      const latest = (r.data || []).find((j: Job) => j.id === job.id);
      if (latest) setJob(latest);
    }, 3000);
    return () => clearInterval(t);
  }, [job?.id, job?.status]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setJob(null);
    setCopies(1);
    if (inputRef.current) inputRef.current.value = "";
  };

  // 업로드한 파일이든 양식이든 DRAFT 작업을 받아 미리보기를 띄운다
  const openDraft = async (create: () => Promise<{ data: Job }>, failMessage: string) => {
    // 이전에 올리고 인쇄하지 않은 작업은 정리
    if (job && job.status === "DRAFT") api.post(`/print/jobs/${job.id}/cancel`).catch(() => {});
    reset();
    setUploading(true);
    try {
      const j = (await create()).data;
      setJob(j);
      if (j.previewReady) {
        const pdf = await api.get(`/print/jobs/${j.id}/preview`, { responseType: "blob" });
        setPreviewUrl(URL.createObjectURL(new Blob([pdf.data], { type: "application/pdf" })));
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || failMessage);
    } finally {
      setUploading(false);
    }
  };

  const upload = (file: File) => {
    if (file.size > 50 * 1024 * 1024) return alert("50MB 이하 파일만 인쇄할 수 있어요.");
    const form = new FormData();
    form.append("file", file);
    return openDraft(() => api.post("/print/upload", form), "파일을 올리지 못했어요.");
  };

  const startForm = async (f: PrintForm) => {
    if (startingForm) return;
    setStartingForm(f.key);
    await openDraft(() => api.post(`/print/forms/${f.key}`), "양식을 불러오지 못했어요.");
    setStartingForm(null);
  };

  const submit = async () => {
    if (!job || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/print/jobs/${job.id}/submit`, { copies });
      setJob(res.data);
      loadHistory();
    } catch (e: any) {
      alert(e?.response?.data?.message || "인쇄를 요청하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelJob = async (id: number) => {
    try {
      const res = await api.post(`/print/jobs/${id}/cancel`);
      if (job?.id === id) setJob(res.data);
      loadHistory();
    } catch (e: any) {
      alert(e?.response?.data?.message || "취소하지 못했어요.");
    }
  };

  // 최근 인쇄에는 끝난 것(완료·실패) 최근 3개만 — 올렸다가 닫은 것, 대기 중인 것은 위 인쇄 설정 카드에서 보인다
  const finished = history.filter((h) => h.status === "DONE" || h.status === "FAILED").slice(0, 3);

  const totalPages = job?.pageCount ? job.pageCount * (job.status === "DRAFT" ? copies : job.copies) : null;
  const requested = job && job.status !== "DRAFT";

  return (
    <div className="relative min-h-screen pt-24 md:pt-28 pb-20">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(10 132 255 / 0.18), transparent 65%)" }} />
        <div className="absolute top-1/3 -right-32 w-[560px] h-[560px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(52 199 89 / 0.12), transparent 65%)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 md:mb-8">
          <div>
            <h1 className="text-[34px] md:text-[40px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight">프린터</h1>
            <p className="text-[15px] text-[#6E6E73] mt-1">파일을 올리거나 양식을 골라 미리보기를 확인한 뒤, 동아리방 프린터로 바로 인쇄해요.</p>
          </div>
          {printer && (
            <span className="glass-card inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-semibold text-[#1D1D1F] self-start md:self-auto">
              <span className={`w-2 h-2 rounded-full ${printer.online ? "bg-[#34C759]" : "bg-[#AEAEB2]"}`} />
              {printer.online ? "프린터 연결됨" : "프린터 꺼짐 · 요청은 대기열에 저장돼요"}
              {printer.queued > 0 && <span className="text-[#8E8E93] font-medium">대기 {printer.queued}건</span>}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 md:gap-5 items-start">
          {/* 미리보기 / 업로드 */}
          <div className="glass-card rounded-[28px] p-3 md:p-4 min-h-[420px] md:min-h-[620px] flex flex-col">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
            />
            {uploading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#8E8E93]">
                <Loader2 size={28} className="animate-spin text-[#0071E3]" />
                <p className="text-sm">{startingForm ? "양식 미리보기를 불러오는 중이에요…" : "파일을 올리고 미리보기를 만드는 중이에요…"}</p>
              </div>
            ) : job && previewUrl ? (
              <iframe title="인쇄 미리보기" src={`${previewUrl}#view=FitH`} className="flex-1 w-full rounded-[20px] bg-[#F2F2F7] min-h-[400px] md:min-h-[590px]" />
            ) : job ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
                <FileText size={36} className="text-[#C7C7CC]" />
                <p className="text-[15px] font-semibold text-[#1D1D1F]">{job.fileName}</p>
                <p className="text-sm text-[#8E8E93]">{job.errorMessage || "미리보기를 만들지 못했어요. 인쇄는 그대로 할 수 있어요."}</p>
              </div>
            ) : (
              <FileDropZone inputRef={inputRef} label="놓으면 바로 올라가요" className="flex-1 flex">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex-1 w-full rounded-[22px] border-2 border-dashed border-black/[0.10] hover:border-[#0071E3]/40 hover:bg-[#0071E3]/[0.03] transition-colors flex flex-col items-center justify-center gap-3 px-6 py-16"
                >
                  <span className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center"><Upload size={24} /></span>
                  <span className="text-[17px] font-semibold text-[#1D1D1F]">파일을 끌어다 놓거나 눌러서 선택</span>
                  <span className="text-[13px] text-[#8E8E93]">PDF · PPT/PPTX · HWP/HWPX · DOC/DOCX · 최대 50MB</span>
                </button>
              </FileDropZone>
            )}
          </div>

          {/* 인쇄 설정 */}
          <div className="space-y-4">
            {/* 양식 출력 — 디스코드 프린터봇 고정 메뉴의 양식과 같은 것. 설정 앱처럼 한 줄씩 */}
            {forms.length > 0 && (
              <div className="glass-card rounded-[28px] p-2 md:p-2.5">
                <p className="text-[13px] font-semibold text-[#8E8E93] px-3 pt-2.5 pb-1.5">양식 출력</p>
                <div className="divide-y divide-black/[0.05]">
                  {forms.map((f) => {
                    const meta = FORM_META[f.key] || { icon: FileText, hint: "" };
                    const Icon = meta.icon;
                    const active = job?.formKey === f.key && job.status === "DRAFT";
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => startForm(f)}
                        disabled={!f.available || !!startingForm || uploading}
                        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-[18px] text-left transition-colors disabled:opacity-50 ${active ? "bg-[#0071E3]/[0.07]" : "hover:bg-black/[0.035]"}`}
                      >
                        <span
                          className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]"
                          style={{ backgroundColor: `${f.color}14`, color: f.color }}
                        >
                          <Icon size={17} strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-[#1D1D1F] leading-tight">{f.name}</span>
                          <span className="block text-[12px] text-[#8E8E93] mt-0.5 truncate">
                            {f.available ? meta.hint : "양식 파일 준비 중"}
                          </span>
                        </span>
                        {startingForm === f.key ? (
                          <Loader2 size={16} className="animate-spin text-[#8E8E93] shrink-0" />
                        ) : active ? (
                          <Check size={16} strokeWidth={2.6} className="text-[#0071E3] shrink-0" />
                        ) : (
                          <ChevronRight size={17} className="text-[#C7C7CC] group-hover:text-[#8E8E93] transition-colors shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="glass-card rounded-[28px] p-5 md:p-6">
              <p className="text-[13px] font-semibold text-[#8E8E93] mb-2">인쇄 설정</p>
              {job ? (
                <>
                  <div className="flex items-start gap-3 mb-5">
                    <span className="w-10 h-10 rounded-xl bg-black/[0.05] text-[#6E6E73] flex items-center justify-center shrink-0 text-[11px] font-bold uppercase">{job.extension}</span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#1D1D1F] break-all leading-snug">{job.fileName}</p>
                      <p className="text-xs text-[#8E8E93] mt-0.5">{job.pageCount ? `${job.pageCount}쪽` : "쪽수 확인 불가"}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[15px] text-[#1D1D1F]">매수</span>
                    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.05]">
                      <button
                        onClick={() => setCopies((c) => Math.max(1, c - 1))}
                        disabled={!!requested || copies <= 1}
                        aria-label="한 장 줄이기"
                        className="w-8 h-8 rounded-full bg-[#fff] shadow-[0_1px_2px_rgb(0_0_0/0.1)] flex items-center justify-center text-[#1D1D1F] disabled:opacity-40"
                      ><Minus size={15} /></button>
                      <span className="w-9 text-center text-[17px] font-bold tabular-nums text-[#1D1D1F]">{requested ? job.copies : copies}</span>
                      <button
                        onClick={() => setCopies((c) => Math.min(MAX_COPIES, c + 1))}
                        disabled={!!requested || copies >= MAX_COPIES}
                        aria-label="한 장 늘리기"
                        className="w-8 h-8 rounded-full bg-[#fff] shadow-[0_1px_2px_rgb(0_0_0/0.1)] flex items-center justify-center text-[#1D1D1F] disabled:opacity-40"
                      ><Plus size={15} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-[#8E8E93] text-right mb-5">
                    {totalPages ? `${job.pageCount}쪽 × ${requested ? job.copies : copies}부 = 총 ${totalPages}쪽` : `최대 ${MAX_COPIES}부`}
                  </p>

                  {!requested ? (
                    <div className="flex gap-2">
                      <button onClick={() => { cancelJob(job.id); reset(); }} className="h-11 px-4 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors">{job.formKey ? "닫기" : "다른 파일"}</button>
                      <button
                        onClick={submit}
                        disabled={submitting}
                        className="flex-1 h-11 rounded-full bg-[#0071E3] text-white text-[15px] font-semibold hover:bg-[#0077ED] transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} 인쇄
                      </button>
                    </div>
                  ) : (
                    <JobProgress job={job} onCancel={() => cancelJob(job.id)} onNew={reset} />
                  )}
                </>
              ) : (
                <p className="text-sm text-[#AEAEB2] py-6">파일을 올리거나 양식을 고르면 여기서 매수를 고르고 인쇄할 수 있어요.</p>
              )}
            </div>

            {/* 최근 인쇄 */}
            <div className="glass-card rounded-[28px] p-5 md:p-6">
              <p className="text-[13px] font-semibold text-[#8E8E93] mb-2">최근 인쇄</p>
              {finished.length === 0 ? (
                <p className="text-sm text-[#AEAEB2] py-3">아직 인쇄한 기록이 없어요.</p>
              ) : (
                <div className="divide-y divide-black/[0.05]">
                  {finished.map((h) => {
                    const st = STATUS_LABEL[h.status];
                    return (
                      <div key={h.id} className="flex items-center gap-3 py-2.5" title={h.status === "FAILED" ? h.errorMessage || "" : undefined}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-[#1D1D1F] truncate">{h.fileName}</p>
                          <p className="text-[11px] text-[#8E8E93]">{fmtTime(h.finishedAt || h.queuedAt || h.createdAt)} · {h.copies}부</p>
                        </div>
                        <span className="shrink-0 text-[12px] font-semibold" style={{ color: st.color }}>{st.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 인쇄 요청 후 진행 단계 — 대기 → 인쇄 중 → 완료 (실패·취소는 따로)
const JobProgress = ({ job, onCancel, onNew }: { job: Job; onCancel: () => void; onNew: () => void }) => {
  const steps = [
    { key: "QUEUED", label: job.status === "QUEUED" && job.queuePosition > 0 ? `대기 중 · 앞에 ${job.queuePosition}건` : "대기 중" },
    { key: "PRINTING", label: "프린터로 보내는 중" },
    { key: "DONE", label: "인쇄 완료" },
  ];
  const order = ["QUEUED", "PRINTING", "DONE"];
  const at = order.indexOf(job.status);
  const ended = job.status === "FAILED" || job.status === "CANCELED";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {ended ? (
        <div className={`rounded-2xl p-4 mb-3 ${job.status === "FAILED" ? "bg-[#FF3B30]/[0.07]" : "bg-black/[0.04]"}`}>
          <p className={`text-[15px] font-semibold ${job.status === "FAILED" ? "text-[#D70015]" : "text-[#6E6E73]"}`}>
            {job.status === "FAILED" ? "인쇄하지 못했어요" : "인쇄를 취소했어요"}
          </p>
          {job.errorMessage && <p className="text-xs text-[#8E8E93] mt-1">{job.errorMessage}</p>}
        </div>
      ) : (
        <div className="space-y-2.5 mb-4">
          {steps.map((s, i) => {
            const done = at > i || job.status === "DONE";
            const current = at === i && job.status !== "DONE";
            return (
              <div key={s.key} className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-[#34C759] text-white" : current ? "bg-[#0071E3] text-white" : "bg-black/[0.06] text-transparent"}`}>
                  {done ? <Check size={13} strokeWidth={3} /> : current ? <Loader2 size={12} className="animate-spin" /> : null}
                </span>
                <span className={`text-[14px] ${done || current ? "text-[#1D1D1F] font-semibold" : "text-[#AEAEB2]"}`}>{s.label}</span>
              </div>
            );
          })}
          {job.status === "DONE" && <p className="text-xs text-[#8E8E93] pl-8">동아리방 프린터에서 출력물을 가져가세요.</p>}
        </div>
      )}
      <div className="flex gap-2">
        {job.status === "QUEUED" && (
          <button onClick={onCancel} className="h-11 px-4 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#FF3B30] hover:bg-[#FF3B30]/[0.08] transition-colors">취소</button>
        )}
        <button onClick={onNew} className="flex-1 h-11 rounded-full bg-black/[0.05] text-[15px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors inline-flex items-center justify-center gap-1.5">
          <RotateCcw size={15} /> 다른 파일 인쇄
        </button>
      </div>
    </motion.div>
  );
};
