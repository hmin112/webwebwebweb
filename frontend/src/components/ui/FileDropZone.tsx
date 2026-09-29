import { useRef, useState, type ReactNode, type RefObject } from "react";
import { Upload } from "lucide-react";

// ✨ [2026-09-29 신규] 파일 끌어다 놓기 영역. 화면마다 이미 있는 숨은 <input type="file">에 놓은 파일을
// 그대로 넣고 change 이벤트를 발생시켜서, 각 화면의 기존 onChange 처리(형식 검사·미리보기·업로드)를
// 손대지 않고 재사용한다. accept/multiple도 그 input의 속성을 그대로 따른다.

const matchesAccept = (file: File, accept: string) => {
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
};

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");

export const FileDropZone = ({
  inputRef,
  disabled,
  children,
  className = "",
  label = "여기에 놓아서 올리기",
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) => {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const reset = () => {
    depth.current = 0;
    setOver(false);
  };

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (disabled || !hasFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        reset();
        const input = inputRef.current;
        if (!input || input.disabled) return;

        const dropped = Array.from(e.dataTransfer.files);
        let accepted = dropped.filter((f) => matchesAccept(f, input.accept || ""));
        if (accepted.length === 0) {
          alert(`이 칸에는 ${input.accept.replace(/,/g, ", ")} 파일만 올릴 수 있어요.`);
          return;
        }
        if (!input.multiple) accepted = accepted.slice(0, 1);
        if (accepted.length < dropped.length && input.multiple) {
          alert(`형식이 맞지 않는 파일 ${dropped.length - accepted.length}개는 제외했어요.`);
        }

        const transfer = new DataTransfer();
        accepted.forEach((f) => transfer.items.add(f));
        input.files = transfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/85 text-indigo-600 text-xs md:text-sm font-black">
          <Upload size={16} /> {label}
        </div>
      )}
    </div>
  );
};

// 업로드 영역 밖에 파일을 잘못 놓았을 때 브라우저가 그 파일을 열어버려(작성 중인 내용이 날아감) 막는다.
// 파일 드래그일 때만 막아서, 입력칸에 글자를 끌어다 놓는 기본 동작은 그대로 둔다.
export const preventStrayFileDrops = () => {
  const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types || []).includes("Files");
  window.addEventListener("dragover", (e) => {
    if (isFileDrag(e)) e.preventDefault();
  });
  window.addEventListener("drop", (e) => {
    if (isFileDrag(e)) e.preventDefault();
  });
};
