import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// ✨ [2026-10-01] 인쇄 미리보기 — 휴대폰 브라우저는 iframe 안의 PDF를 못 보여줘서, pdf.js로 쪽마다 그림으로 그린다.
// pdf.js는 이 화면에서만 필요하니 처음 열 때 따로 불러오고, 쪽은 화면 가까이 왔을 때만 그린다.

const PDFJS_VERSION = "4.10.38";

type PdfDoc = { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => Promise<void> };

const loadPdfjs = async () => {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs;
};

export const PdfPreview = ({ data }: { data: ArrayBuffer }) => {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDoc | null = null;
    setDoc(null);
    setError(false);
    loadPdfjs()
      .then((pdfjs) =>
        pdfjs.getDocument({
          data: new Uint8Array(data.slice(0)),
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
        }).promise
      )
      .then((d: PdfDoc) => {
        loaded = d;
        if (cancelled) d.destroy();
        else setDoc(d);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [data]);

  if (error) {
    return <div className="flex-1 flex items-center justify-center text-sm text-[#8E8E93] py-16">미리보기를 열지 못했어요. 인쇄는 그대로 할 수 있어요.</div>;
  }
  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#0071E3]" />
      </div>
    );
  }
  return (
    <div className="flex-1 rounded-[20px] bg-[#F2F2F7] p-3 md:p-5 space-y-3 md:space-y-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto overscroll-contain">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} pageNumber={i + 1} total={doc.numPages} />
      ))}
    </div>
  );
};

const PdfPage = ({ doc, pageNumber, total }: { doc: PdfDoc; pageNumber: number; total: number }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.414); // A4 세로 비율로 자리를 먼저 잡아 둔다
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: any = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const canvas = canvasRef.current;
      const box = boxRef.current;
      if (!canvas || !box) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = (box.clientWidth / base.width) * dpr;
      const viewport = page.getViewport({ scale });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
      await task.promise;
      if (!cancelled) setDrawn(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [visible, doc, pageNumber]);

  return (
    <div className="relative">
      <div
        ref={boxRef}
        className="relative w-full bg-white rounded-[10px] overflow-hidden shadow-[0_1px_3px_rgb(0_0_0/0.08),0_8px_24px_rgb(0_0_0/0.06)]"
        style={{ aspectRatio: `1 / ${ratio}` }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />
        {!drawn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={18} className="animate-spin text-[#C7C7CC]" />
          </div>
        )}
      </div>
      {total > 1 && <p className="mt-1.5 text-center text-[11px] font-medium text-[#8E8E93] tabular-nums">{pageNumber} / {total}</p>}
    </div>
  );
};
