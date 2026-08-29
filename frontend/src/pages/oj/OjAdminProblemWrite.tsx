import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, X, Upload, Check } from "lucide-react";
import { api } from "../../api/axios";

type Sample = { input: string; output: string };
type TestCaseInfo = { input_name: string; output_name: string };

const DIFFICULTIES = [
  { value: "Low", label: "쉬움" },
  { value: "Mid", label: "보통" },
  { value: "High", label: "어려움" },
];

// 이미 HTML 태그가 있으면 그대로 두고(기존 문제 수정 시 서식 보존), 순수 텍스트면
// 줄바꿈을 <br/>로 바꿔 최소한의 서식만 적용해서 보낸다.
const toDescriptionHtml = (text: string) => {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
};

const buildTestCaseScore = (info: TestCaseInfo[]) => {
  if (!info || info.length === 0) return [];
  const base = Math.floor(100 / info.length);
  const remainder = 100 - base * info.length;
  return info.map((f, idx) => ({
    input_name: f.input_name,
    output_name: f.output_name,
    score: base + (idx === info.length - 1 ? remainder : 0),
  }));
};

export const OjAdminProblemWrite = ({ loginId }: { loginId?: string }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(id);

  const [displayId, setDisplayId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [hint, setHint] = useState("");
  const [samples, setSamples] = useState<Sample[]>([{ input: "", output: "" }]);
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [difficulty, setDifficulty] = useState("Low");
  const [visible, setVisible] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [languageOptions, setLanguageOptions] = useState<string[]>([]);

  const [testCaseId, setTestCaseId] = useState<string | null>(null);
  const [testCaseInfo, setTestCaseInfo] = useState<TestCaseInfo[]>([]);
  const [uploadingTestCase, setUploadingTestCase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!loginId) return;
    api.get("/oj/languages", { params: { loginId } })
      .then((res) => setLanguageOptions((res.data?.languages ?? []).map((l: any) => l.name)))
      .catch(() => {});
  }, [loginId]);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/admin/oj/problems/${id}`)
      .then((res) => {
        const d = res.data;
        setDisplayId(d._id || "");
        setTitle(d.title || "");
        setDescription(d.description || "");
        setInputDescription(d.input_description || "");
        setOutputDescription(d.output_description || "");
        setHint(d.hint || "");
        setSamples(d.samples && d.samples.length > 0 ? d.samples : [{ input: "", output: "" }]);
        setTimeLimit(d.time_limit ?? 1000);
        setMemoryLimit(d.memory_limit ?? 256);
        setDifficulty(d.difficulty || "Low");
        setVisible(Boolean(d.visible));
        setTags(d.tags || []);
        setLanguages(d.languages || []);
        setTestCaseId(d.test_case_id || null);
        setTestCaseInfo((d.test_case_score || []).map((s: any) => ({ input_name: s.input_name, output_name: s.output_name })));
      })
      .catch(() => alert("문제 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleTestCaseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTestCase(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("spj", "false");
      const res = await api.post("/admin/oj/test-cases", form);
      setTestCaseId(res.data.id);
      setTestCaseInfo(res.data.info || []);
    } catch (err) {
      alert("테스트케이스 업로드에 실패했습니다. zip 안에 1.in/1.out 형식의 파일이 있는지 확인해주세요.");
    } finally {
      setUploadingTestCase(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  };

  const handleSave = async () => {
    if (!displayId.trim() || !title.trim()) {
      alert("문제 코드와 제목은 필수입니다.");
      return;
    }
    if (languages.length === 0) {
      alert("허용 언어를 하나 이상 선택해주세요.");
      return;
    }
    if (!testCaseId) {
      alert("테스트케이스(zip)를 업로드해주세요.");
      return;
    }

    const payload = {
      _id: displayId.trim(),
      title: title.trim(),
      description: toDescriptionHtml(description),
      input_description: toDescriptionHtml(inputDescription),
      output_description: toDescriptionHtml(outputDescription),
      hint: toDescriptionHtml(hint),
      samples: samples.filter((s) => s.input.trim() || s.output.trim()),
      test_case_id: testCaseId,
      test_case_score: buildTestCaseScore(testCaseInfo),
      languages,
      template: {},
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      io_mode: { input: "input.txt", output: "output.txt", io_mode: "Standard IO" },
      spj: false,
      rule_type: "ACM",
      visible,
      difficulty,
      source: "",
      share_submission: false,
      tags,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/oj/problems/${id}`, payload);
      } else {
        await api.post("/admin/oj/problems", payload);
      }
      alert(isEdit ? "수정되었습니다." : "새 문제가 등록되었습니다.");
      navigate("/oj/admin");
    } catch (err: any) {
      alert(err?.response?.data?.message || "저장 중 오류가 발생했습니다. 문제 코드가 중복되지 않았는지 확인해주세요.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto pt-40 text-center text-slate-400 font-medium">불러오는 중...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-24">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/oj/admin")}
            className="flex items-center gap-2 text-[13px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={15} /> 취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-6 rounded-2xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isEdit ? "수정 완료" : "등록 완료"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">문제 코드</label>
              <input
                value={displayId}
                onChange={(e) => setDisplayId(e.target.value)}
                placeholder="예: 1001"
                className="w-full mt-1.5 h-11 px-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="문제 제목"
                className="w-full mt-1.5 h-11 px-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">문제 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="문제 설명을 입력하세요 (일반 텍스트로 입력해도 되고, HTML 태그를 직접 써도 됩니다)"
              className="w-full mt-1.5 min-h-[140px] p-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">입력 설명</label>
              <textarea
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                className="w-full mt-1.5 min-h-[100px] p-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06] resize-y"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">출력 설명</label>
              <textarea
                value={outputDescription}
                onChange={(e) => setOutputDescription(e.target.value)}
                className="w-full mt-1.5 min-h-[100px] p-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-[3px] focus:ring-slate-900/[0.06] resize-y"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">예제</label>
              <button
                onClick={() => setSamples((prev) => [...prev, { input: "", output: "" }])}
                className="flex items-center gap-1 text-[12px] font-semibold text-slate-500 hover:text-slate-900"
              >
                <Plus size={13} /> 예제 추가
              </button>
            </div>
            <div className="space-y-3">
              {samples.map((s, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-3 items-start">
                  <textarea
                    value={s.input}
                    onChange={(e) => setSamples((prev) => prev.map((x, i) => (i === idx ? { ...x, input: e.target.value } : x)))}
                    placeholder={`예제 ${idx + 1} 입력`}
                    className="min-h-[70px] p-3 text-[13px] font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-900 resize-y"
                  />
                  <div className="flex gap-2 items-start">
                    <textarea
                      value={s.output}
                      onChange={(e) => setSamples((prev) => prev.map((x, i) => (i === idx ? { ...x, output: e.target.value } : x)))}
                      placeholder={`예제 ${idx + 1} 출력`}
                      className="flex-1 min-h-[70px] p-3 text-[13px] font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-slate-900 resize-y"
                    />
                    {samples.length > 1 && (
                      <button onClick={() => setSamples((prev) => prev.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">테스트케이스 (zip)</label>
            <div className="mt-1.5 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingTestCase}
                className="flex items-center gap-2 h-11 px-5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-[13px] font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Upload size={16} /> {uploadingTestCase ? "업로드 중..." : "zip 파일 선택"}
              </button>
              <input ref={fileInputRef} type="file" accept=".zip" onChange={handleTestCaseFile} className="hidden" />
              {testCaseInfo.length > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-green-600">
                  <Check size={15} /> {testCaseInfo.length}개 파일 ({testCaseInfo.map((f) => f.input_name).join(", ")})
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">zip 안에 1.in/1.out, 2.in/2.out … 형식의 입출력 파일이 있어야 합니다.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">시간 제한 (ms)</label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full mt-1.5 h-11 px-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">메모리 제한 (MB)</label>
              <input
                type="number"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                className="w-full mt-1.5 h-11 px-4 text-[14px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">난이도</label>
            <div className="flex gap-2 mt-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`px-4 h-9 rounded-full text-[13px] font-medium transition-colors ${
                    difficulty === d.value ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">허용 언어</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {languageOptions.map((lang) => (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`px-4 h-9 rounded-full text-[13px] font-medium transition-colors ${
                    languages.includes(lang) ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">태그 (폴더)</label>
            <div className="flex flex-wrap gap-2 mt-1.5 mb-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1.5 pl-3 pr-2 h-8 rounded-full bg-slate-100 text-[12px] font-medium text-slate-600">
                  {t}
                  <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="text-slate-400 hover:text-red-500">
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="태그 입력 후 Enter (예: 2026, 자료구조)"
                className="flex-1 h-10 px-4 text-[13px] bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-slate-900"
              />
              <button onClick={addTag} className="h-10 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-[13px] font-medium text-slate-500 hover:bg-slate-100">추가</button>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="w-4 h-4 accent-slate-900" />
            <span className="text-[13px] font-medium text-slate-700">즉시 공개 (체크 해제 시 관리자에게만 보이는 숨김 상태로 저장)</span>
          </label>
        </div>
      </motion.div>
    </div>
  );
};
