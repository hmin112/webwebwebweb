import { Fragment } from "react";
import { ArrowLeft, Trash2, Edit3, Trophy, CalendarDays, Award } from "lucide-react";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

// ✨ [2026-09-30] 상 배지 — 목록·홈과 동일하게: 사진 위는 흐린 유리 + 흰 테두리(award-glass),
// 사진이 없을 때(흰 카드 위)는 금·은·동 색 테두리 알약
const getAwardBadgeStyle = (awardName?: string, onPhoto = true) => {
  if (onPhoto) return "award-glass";
  const name = awardName || "";
  const light = "bg-transparent border-[1.5px]";
  if (name.includes("금")) return `${light} border-[#C9A227] text-[#A8841A]`;
  if (name.includes("은")) return `${light} border-[#AEAEB2] text-[#6E6E73]`;
  if (name.includes("동")) return `${light} border-[#C98547] text-[#A6662C]`;
  return `${light} border-amber-500 text-amber-600`;
};

// 상 이름 → 그 상을 받은 부원 프로필 순서로 한 줄에 나열 (사진 위 / 흰 카드 위 공용)
const AwardRow = ({ awardGroups, onPhoto }: { awardGroups: any[]; onPhoto: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
    {awardGroups.map((award: any, i: number) => (
      <Fragment key={award.awardName || i}>
        {i > 0 && <span aria-hidden className={`w-px h-4 mx-1 ${onPhoto ? "bg-[rgb(255_255_255/0.4)]" : "bg-black/10"}`} />}
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] md:text-xs font-bold whitespace-nowrap ${getAwardBadgeStyle(award.awardName, onPhoto)}`}>
          <Trophy className="w-3 h-3 md:w-3.5 md:h-3.5" /> {award.awardName}
        </span>
        {(award.participants || []).map((p: any) => (
          <span
            key={p.loginId}
            className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 ${onPhoto ? "hero-glass" : "bg-black/[0.04]"}`}
          >
            <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 ${onPhoto ? "bg-[rgb(255_255_255/0.2)]" : "bg-[#E5E5EA]"}`}>
              {p.profileImage ? (
                <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className={`w-full h-full flex items-center justify-center font-bold text-[9px] ${onPhoto ? "text-white" : "text-[#6E6E73]"}`}>
                  {p.name?.[0] || "?"}
                </span>
              )}
            </span>
            <span className={`text-[11px] md:text-xs font-semibold whitespace-nowrap ${onPhoto ? "text-white" : "text-[#1D1D1F]"}`}>
              {formatStudentId(p.studentId)} {p.name}
            </span>
          </span>
        ))}
      </Fragment>
    ))}
  </div>
);

export const HallOfFameDetail = ({ onNavigate, isAdmin, isLoggedIn, entry, onDelete }: any) => {
  if (!entry) return <div className="pt-40 text-center font-semibold text-[#8E8E93]">명예의 전당 게시물을 찾을 수 없습니다.</div>;
  const awardGroups = entry.awards?.length ? entry.awards : [{ awardName: entry.awardName, participants: entry.participants || [] }];

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-20 pt-24 md:pt-32">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-8 md:mb-10">
          <button
            onClick={() => onNavigate("halloffame-page")}
            className="flex items-center text-[#6E6E73] font-medium text-sm hover:text-[#1D1D1F] transition-colors group"
          >
            <ArrowLeft size={17} className="mr-1.5 group-hover:-translate-x-0.5 transition-transform" /> 목록으로
          </button>

          {isAdmin && isLoggedIn && (
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate("halloffame-write", entry.id)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-black/[0.04] hover:bg-black/[0.07] text-[#0071E3] text-sm font-semibold transition-colors"
              >
                <Edit3 size={15} /> 수정
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-black/[0.04] hover:bg-[#FF3B30]/10 text-[#FF3B30] text-sm font-semibold transition-colors"
              >
                <Trash2 size={15} /> 삭제
              </button>
            </div>
          )}
        </div>

        <header className="mb-6 md:mb-8">
          <h1 className="text-[28px] md:text-[40px] font-bold text-[#1D1D1F] tracking-[-0.025em] leading-tight mb-3">
            {entry.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm md:text-[15px] text-[#6E6E73]">
            {entry.competitionName && (
              <span className="inline-flex items-center gap-1.5">
                <Award size={16} className="text-[#C9A227]" /> {entry.competitionName}
              </span>
            )}
            {entry.date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={16} className="text-[#8E8E93]" /> {entry.date}
              </span>
            )}
          </div>
        </header>

        {entry.image ? (
          <div className="relative rounded-[24px] md:rounded-[32px] overflow-hidden mb-10 md:mb-14 border border-black/[0.06] shadow-[0_8px_30px_rgb(0_0_0/0.06)]">
            <img src={entry.image} alt={entry.title} className="block w-full h-auto" />
            {/* 사진 위쪽에 옅은 어둠을 깔아 흰 글자가 어떤 사진 위에서도 읽히게 (아래쪽은 상장·사람에 가려 잘 안 보여서 상단 배치) */}
            <div className="absolute inset-x-0 top-0 pb-20 md:pb-28 px-4 pt-4 md:px-6 md:pt-6 bg-gradient-to-b from-black/55 via-black/20 to-transparent">
              <AwardRow awardGroups={awardGroups} onPhoto />
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#fff] border border-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.04)] p-4 md:p-5 mb-10 md:mb-14">
            <AwardRow awardGroups={awardGroups} onPhoto={false} />
          </div>
        )}

        {entry.content && (
          <article className="text-[#1D1D1F]/80 text-base md:text-[17px] leading-[1.75] whitespace-pre-wrap">
            {entry.content}
          </article>
        )}
      </div>
    </div>
  );
};
