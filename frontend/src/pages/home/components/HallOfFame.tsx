import { motion } from "framer-motion";
import { Trophy, Sparkles, ArrowRight } from "lucide-react";

const formatStudentId = (id?: string) => {
  if (!id) return "??";
  const strId = String(id).trim();
  if (strId.includes("학번")) return strId.replace(/[^0-9]/g, "");
  if (strId.length === 8) return strId.substring(2, 4);
  if (strId.length === 2) return strId;
  return strId;
};

// 금상/은상/동상은 실제 메달 색상으로, 그 외(대상 등)는 기본 앰버 색상으로 강조
const getAwardBadgeStyle = (awardName?: string) => {
  const name = awardName || "";
  if (name.includes("금")) return "bg-gradient-to-br from-[#FFDD66] to-[#B8860B] text-white shadow-lg shadow-amber-300/50";
  if (name.includes("은")) return "bg-gradient-to-br from-[#F4F4F5] to-[#9CA3AF] text-slate-900 shadow-lg shadow-slate-300/50";
  if (name.includes("동")) return "bg-gradient-to-br from-[#E0985A] to-[#8B5A2B] text-white shadow-lg shadow-orange-300/50";
  return "bg-amber-500 text-white shadow-lg";
};

export const HallOfFame = ({ onNavigate, entries }: { onNavigate: (page: string, id?: number) => void; entries: any[] }) => {
  return (
    <section id="halloffame" className="py-10 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        <div className="flex flex-row justify-between items-end mb-8 md:mb-16 gap-4 md:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-amber-50 text-amber-600 font-bold text-xs md:text-sm mb-3 md:mb-4">
              <Trophy className="w-4 h-4 md:w-5 md:h-5" /> Hall of Fame
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">명예의 전당</h2>
          </div>
          <button
            onClick={() => onNavigate("halloffame-page")}
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-0"
          >
            전체보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 py-16 text-center text-slate-300 font-bold flex flex-col items-center gap-3">
            <Sparkles className="w-8 h-8" />
            아직 등록된 수상 소식이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => onNavigate("halloffame-detail", entry.id)}
                className="group cursor-pointer"
              >
                <div className="relative w-full aspect-square rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 mb-3 md:mb-4">
                  {entry.image ? (
                    <img
                      src={entry.image}
                      alt={entry.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-amber-200" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <span className={`px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-lg md:rounded-full text-[10px] md:text-xs font-black line-clamp-1 ${getAwardBadgeStyle(entry.awardName)}`}>
                      {entry.awardName}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm md:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                  {entry.title}
                </h3>
                <p className="text-[11px] md:text-sm text-slate-400 font-bold line-clamp-1">{entry.competitionName}</p>

                {entry.participants && entry.participants.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {entry.participants.slice(0, 3).map((p: any) => (
                      <div
                        key={p.loginId}
                        className="flex items-center gap-1 md:gap-1.5 bg-slate-50 rounded-full pl-0.5 pr-2 md:pr-2.5 py-0.5 md:py-1 border border-slate-100"
                      >
                        <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                          {p.profileImage ? (
                            <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-[8px]">
                              {p.name?.[0] || "?"}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] md:text-[11px] font-bold text-slate-700 whitespace-nowrap">
                          {formatStudentId(p.studentId)} {p.name}
                        </span>
                      </div>
                    ))}
                    {entry.participants.length > 3 && (
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-400">
                        +{entry.participants.length - 3}명
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
