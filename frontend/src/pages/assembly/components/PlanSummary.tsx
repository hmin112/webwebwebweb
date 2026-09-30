import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { CARD, StatusBadge, submitStateOf } from "../assemblyUi";

// ✨ [2026-09-30] 계획서 내용 보기 — 커뮤니티 상세 팝업에서 쓰던 것을 공용으로 뺐다.
// 관련 링크는 계획서에서 빠지고 마이페이지/팀 탭에서 따로 관리하므로 여기서는 보여주지 않는다.
export const PlanContentView = ({ plan }: { plan: any }) => {
  const goals: string[] = (plan.planGoals || []).filter((g: string) => g && g.trim());
  const roadmap: any[] = plan.planRoadmapItems || [];
  const roles: any[] = (plan.planRoles || []).filter((r: any) => r.name || r.role || r.duties);
  const times = roadmap.flatMap((r) => [new Date(r.startDate).getTime(), new Date(r.endDate).getTime()]).filter((t) => !isNaN(t));
  const min = times.length ? Math.min(...times) : 0;
  const span = times.length ? Math.max(Math.max(...times) - min, 86400000) : 1;
  const Label = ({ children }: { children: ReactNode }) => (
    <p className="text-xs font-semibold text-[#6E6E73] ml-1 mb-2">{children}</p>
  );
  return (
    <div className="space-y-5">
      {plan.planOverview && (
        <div>
          <Label>배경 및 목표 개요</Label>
          <div className="p-4 bg-[#F5F5F7] rounded-2xl text-sm text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{plan.planOverview}</div>
        </div>
      )}
      {goals.length > 0 && (
        <div>
          <Label>핵심 목표</Label>
          <ol className="space-y-1.5">
            {goals.map((g, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 bg-[#F5F5F7] rounded-xl">
                <span className="w-5 h-5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-bold flex items-center justify-center shrink-0 mt-px">{i + 1}</span>
                <span className="text-sm text-[#1D1D1F]">{g}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {roadmap.length > 0 && (
        <div>
          <Label>로드맵</Label>
          <div className="space-y-3 p-4 bg-[#F5F5F7] rounded-2xl">
            {roadmap.map((r, i) => {
              const st = new Date(r.startDate).getTime();
              const en = new Date(r.endDate).getTime();
              return (
                <div key={i}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-[#1D1D1F] truncate">{r.title}</span>
                    <span className="text-[11px] text-[#8E8E93] shrink-0">{r.startDate} ~ {r.endDate}</span>
                  </div>
                  <div className="relative h-2 bg-black/[0.06] rounded-full overflow-hidden">
                    <div className="absolute top-0 h-full bg-[#0071E3] rounded-full" style={{ left: `${isNaN(st) ? 0 : ((st - min) / span) * 100}%`, width: `${isNaN(st) || isNaN(en) ? 100 : Math.max(((en - st) / span) * 100, 3)}%` }} />
                  </div>
                  {r.detail && <p className="text-xs text-[#6E6E73] mt-1.5 whitespace-pre-wrap">{r.detail}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {roles.length > 0 && (
        <div>
          <Label>역할 및 담당</Label>
          <div className="divide-y divide-black/[0.05] bg-[#F5F5F7] rounded-2xl">
            {roles.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-semibold text-[#1D1D1F] w-24 shrink-0 truncate">{r.name}</span>
                <span className="text-[#0071E3] font-semibold shrink-0">{r.role}</span>
                <span className="text-[#6E6E73] truncate">{r.duties}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {plan.planNotes && (
        <div>
          <Label>기타 참고사항</Label>
          <div className="p-4 bg-[#F5F5F7] rounded-2xl text-sm text-[#1D1D1F] whitespace-pre-wrap leading-relaxed">{plan.planNotes}</div>
        </div>
      )}
    </div>
  );
};

export const hasPlanBody = (plan: any) =>
  Boolean(
    plan &&
      ((plan.planOverview && plan.planOverview.trim()) ||
        (plan.planGoals || []).some((g: string) => g && g.trim()) ||
        (plan.planRoadmapItems || []).length > 0 ||
        (plan.planRoles || []).some((r: any) => r.name || r.role || r.duties) ||
        (plan.planNotes && plan.planNotes.trim()))
  );

// ✨ [2026-09-30] 페이지 하단 "계획서 요약" 카드 — 마이페이지·팀 프로젝트·커뮤니티 부원 상세에서 같이 쓴다
export const PlanSummaryCard = ({
  plan,
  title,
  emptyText,
  showStatus = true,
}: {
  plan: any;
  title?: string;
  emptyText: string;
  showStatus?: boolean;
}) => {
  const filled = hasPlanBody(plan);
  return (
    <div className={`${CARD} rounded-3xl p-5 md:p-7`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#8E8E93] flex items-center gap-1.5">
            <FileText size={13} /> {plan?.month ? `${plan.month}월 계획서` : "계획서"}
          </p>
          <p className={`text-lg md:text-xl font-bold tracking-[-0.02em] mt-0.5 break-words ${title ? "text-[#1D1D1F]" : "text-[#C7C7CC]"}`}>
            {title || "프로젝트 명 없음"}
          </p>
        </div>
        {showStatus && plan && (
          <StatusBadge state={submitStateOf(plan)} label={plan.status === "DRAFT" ? "작성 중" : undefined} />
        )}
      </div>
      {filled ? <PlanContentView plan={plan} /> : <p className="text-sm text-[#8E8E93]">{emptyText}</p>}
    </div>
  );
};
