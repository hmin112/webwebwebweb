import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Star, User, Users } from "lucide-react";
import { api } from "../../../api/axios";
import { CARD } from "../assemblyUi";

// ✨ [2026-09-30] 마이페이지 머리말 오른쪽 "내 프로젝트" 아이콘 줄 — 이번 학기 개인 프로젝트와 참여 중인 팀 프로젝트를
// 앱 아이콘처럼 보여주고, 눌러서 대표 프로젝트를 고른다. 대표 프로젝트는 커뮤니티에 보인다.
// 고르지 않았으면 서버가 자동으로 정한다(팀 프로젝트가 있으면 팀, 없으면 자료를 올린 개인 프로젝트).

export type MyProject = {
  key: string;
  type: "PERSONAL" | "TEAM";
  title: string;
  teamName?: string | null;
  memberCount: number;
  hasMaterials: boolean;
};

export type Representative = {
  key: string;
  type: "PERSONAL" | "TEAM";
  title: string;
  teamName?: string | null;
  chosen: boolean;
};

const TEAM_COLORS = ["#34C759", "#FF9500", "#AF52DE", "#FF2D55", "#5AC8FA"];

const colorOf = (project: MyProject, index: number) =>
  project.type === "PERSONAL" ? "#0071E3" : TEAM_COLORS[index % TEAM_COLORS.length];

export const MyProjectsPicker = ({
  loginId,
  year,
  semester,
  refreshKey,
}: {
  loginId: string;
  year: number;
  semester: number;
  refreshKey?: number;
}) => {
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [representative, setRepresentative] = useState<Representative | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const applyResponse = (data: any) => {
    setProjects(data?.projects || []);
    setRepresentative(data?.representative || null);
  };

  useEffect(() => {
    if (!loginId || loginId === "undefined") return;
    let cancelled = false;
    api
      .get("/assembly/my-projects", { params: { loginId, year, semester } })
      .then((res) => { if (!cancelled) applyResponse(res.data); })
      .catch(() => { if (!cancelled) applyResponse(null); });
    return () => { cancelled = true; };
  }, [loginId, year, semester, refreshKey]);

  // 바깥을 누르거나 Esc로 닫기
  useEffect(() => {
    if (!openKey) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenKey(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenKey(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  const saveRepresentative = async (key: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post("/assembly/representative", { loginId, year, semester, key });
      applyResponse(res.data);
    } catch (e: any) {
      alert(e.response?.data?.message || "대표 프로젝트를 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  if (projects.length === 0) return null;

  return (
    <div ref={rootRef} className="flex items-start gap-2.5">
      {projects.map((project, index) => {
        const color = colorOf(project, index);
        const isRep = representative?.key === project.key;
        const isOpen = openKey === project.key;
        const Icon = project.type === "PERSONAL" ? User : Users;
        const caption = project.type === "PERSONAL" ? "개인" : project.teamName || "팀";
        return (
          <div key={project.key} className="relative flex flex-col items-center w-12">
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : project.key)}
              aria-label={`${project.type === "PERSONAL" ? "개인 프로젝트" : `팀 프로젝트 ${caption}`}${isRep ? " (대표)" : ""}`}
              aria-expanded={isOpen}
              className="relative w-10 h-10 rounded-[12px] flex items-center justify-center transition-transform active:scale-95"
              style={{
                backgroundColor: `${color}1F`,
                color,
                boxShadow: isRep ? `0 0 0 2px #fff, 0 0 0 3.5px ${color}` : "inset 0 0 0 0.5px rgb(0 0 0 / 0.06)",
              }}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
              {isRep && (
                <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[#FF9F0A] ring-2 ring-white flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-white" fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </button>
            <span className={`mt-1 max-w-full truncate text-[10px] font-semibold ${isRep ? "text-[#1D1D1F]" : "text-[#8E8E93]"}`}>
              {caption}
            </span>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className={`${CARD} absolute right-0 top-full mt-2 z-30 w-64 rounded-2xl p-4 text-left shadow-[0_12px_32px_rgb(0_0_0/0.12)]`}
                >
                  <p className="text-[11px] font-semibold text-[#8E8E93] mb-1">
                    {project.type === "PERSONAL"
                      ? "개인 프로젝트"
                      : `팀 프로젝트 · ${project.teamName || "팀"} · ${project.memberCount}명`}
                  </p>
                  <p className={`text-[15px] font-semibold leading-snug break-words ${project.title ? "text-[#1D1D1F]" : "text-[#C7C7CC]"}`}>
                    {project.title || "아직 프로젝트 명이 없어요"}
                  </p>

                  {isRep ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#B25000]">
                        <Star className="w-3.5 h-3.5 text-[#FF9F0A]" fill="currentColor" strokeWidth={0} />
                        대표 프로젝트{representative?.chosen ? "" : " (자동으로 정해졌어요)"}
                      </div>
                      {representative?.chosen && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => saveRepresentative("")}
                          className="mt-2.5 w-full h-9 rounded-full bg-black/[0.05] text-[13px] font-semibold text-[#1D1D1F] hover:bg-black/[0.08] transition-colors disabled:opacity-60"
                        >
                          자동 선택으로 되돌리기
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveRepresentative(project.key)}
                      className="mt-3 w-full h-9 rounded-full bg-[#0071E3] text-white text-[13px] font-semibold hover:bg-[#0077ED] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      대표로 설정
                    </button>
                  )}
                  <p className="mt-2.5 text-[11px] text-[#8E8E93] leading-relaxed">
                    대표 프로젝트는 커뮤니티에서 내 이름 아래에 보여요.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
