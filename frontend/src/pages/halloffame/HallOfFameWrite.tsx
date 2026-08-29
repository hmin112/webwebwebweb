import { api } from "../../api/axios";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Link as LinkIcon, X, Upload, Search, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/button";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

export const HallOfFameWrite = ({ onNavigate, entry, fetchHallOfFame }: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    competitionName: "",
    awardName: "",
    title: "",
    date: "",
    content: "",
    image: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);

  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData({
        competitionName: entry.competitionName || "",
        awardName: entry.awardName || "",
        title: entry.title || "",
        date: entry.date || "",
        content: entry.content || "",
        image: entry.image || ""
      });
      setSelectedParticipants(entry.participants || []);
    }
  }, [entry]);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await api.get("/members/all");
        setAllMembers(res.data || []);
      } catch (e) {
        console.error("부원 목록 로드 실패:", e);
      }
    };
    loadMembers();
  }, []);

  const selectedLoginIds = useMemo(() => new Set(selectedParticipants.map((p) => p.loginId)), [selectedParticipants]);

  const filteredMembers = useMemo(() => {
    return allMembers
      .filter((m) => !selectedLoginIds.has(m.loginId))
      .filter((m) =>
        !memberSearch ||
        (m.name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
        String(m.studentId || "").includes(memberSearch)
      );
  }, [allMembers, memberSearch, selectedLoginIds]);

  const addParticipant = (member: any) => {
    setSelectedParticipants((prev) => [...prev, member]);
    setMemberSearch("");
  };

  const removeParticipant = (loginId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.loginId !== loginId));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async () => {
    if (!formData.competitionName || !formData.awardName || !formData.title || !formData.date) {
      return alert("대회명, 수상내역, 제목, 날짜는 필수입니다. ⚠️");
    }

    try {
      const submitData = new FormData();
      submitData.append("competitionName", formData.competitionName);
      submitData.append("awardName", formData.awardName);
      submitData.append("title", formData.title);
      submitData.append("date", formData.date);
      submitData.append("content", formData.content);

      if (imageFile) {
        submitData.append("files", imageFile);
      } else if (formData.image) {
        submitData.append("image", formData.image);
      }

      selectedParticipants.forEach((p) => submitData.append("participantLoginIds", p.loginId));

      let response;
      if (entry && entry.id) {
        response = await api.put(`/hall-of-fame/${entry.id}`, submitData);
      } else {
        response = await api.post("/hall-of-fame", submitData);
      }

      if (response.status === 200 || response.status === 201) {
        alert(entry ? "수정되었습니다! ✨" : "새로운 수상 소식이 등록되었습니다! 🏆");
        if (fetchHallOfFame) await fetchHallOfFame();
        onNavigate("halloffame-page");
      }
    } catch (error: any) {
      console.error("저장 실패:", error);
      if (error?.response?.status === 403) {
        alert("관리자만 등록/수정할 수 있습니다.");
      } else {
        alert("서버 통신 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={() => onNavigate("halloffame-page")}
            className="text-slate-400 font-bold flex items-center gap-2 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} /> 작성 취소
          </button>
          <Button
            onClick={handlePublish}
            className="bg-indigo-600 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            {entry ? "수정 완료" : "등록 완료"}
          </Button>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Competition</label>
              <input
                type="text"
                placeholder="예: ICPC 대학생 프로그래밍 경시대회"
                value={formData.competitionName}
                onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Award</label>
              <input
                type="text"
                placeholder="예: 대상, 금상"
                value={formData.awardName}
                onChange={(e) => setFormData({ ...formData, awardName: e.target.value })}
                className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="게시물 제목을 입력하세요"
            className="w-full py-4 text-4xl font-black text-slate-900 border-none outline-none tracking-tight placeholder:text-slate-200"
          />

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Date</label>
            <input
              type="text"
              placeholder="예: 2026.08.29"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full max-w-xs px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* 수상자(회원) 선택 */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">수상자</label>

            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((p) => (
                  <div key={p.loginId} className="flex items-center gap-2 bg-indigo-50 rounded-full pl-1 pr-2 py-1">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                      {p.profileImage ? (
                        <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-[9px]">{p.name?.[0] || "?"}</div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-indigo-700">{formatStudentId(p.studentId)} {p.name}</span>
                    <button onClick={() => removeParticipant(p.loginId)} className="text-indigo-300 hover:text-pink-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
                placeholder="이름 또는 학번으로 부원 검색"
                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
              />

              <AnimatePresence>
                {isSearchOpen && filteredMembers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute z-20 mt-2 w-full max-h-64 overflow-y-auto bg-white rounded-2xl border border-slate-100 shadow-xl"
                  >
                    {filteredMembers.slice(0, 20).map((m) => (
                      <button
                        key={m.loginId}
                        onMouseDown={() => addParticipant(m)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-indigo-100 shrink-0">
                          {m.profileImage ? (
                            <img src={m.profileImage} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-xs">{m.name?.[0] || "?"}</div>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 text-sm">{formatStudentId(m.studentId)} {m.name}</span>
                        <UserPlus size={14} className="ml-auto text-slate-300" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 대표 사진 */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">대표 사진</label>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                >
                  <Upload size={18} /> 파일 선택
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
                    setImageFile(null);
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
          </div>

          <div className="pt-6 border-t border-slate-50">
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="수상 소식에 대한 상세 내용을 자유롭게 입력하세요..."
              className="w-full min-h-[300px] text-lg font-medium outline-none resize-none leading-relaxed placeholder:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
