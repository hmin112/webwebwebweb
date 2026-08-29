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
                    <span className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-full bg-amber-500 text-white text-[9px] md:text-[10px] font-black shadow-lg line-clamp-1">
                      {entry.awardName}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm md:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                  {entry.title}
                </h3>
                <p className="text-[11px] md:text-sm text-slate-400 font-bold line-clamp-1">{entry.competitionName}</p>

                {entry.participants && entry.participants.length > 0 && (
                  <div className="flex items-center -space-x-2 mt-2">
                    {entry.participants.slice(0, 4).map((p: any) => (
                      <div
                        key={p.loginId}
                        title={`${formatStudentId(p.studentId)} ${p.name}`}
                        className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden border-2 border-white shadow-sm bg-indigo-100 shrink-0"
                      >
                        {p.profileImage ? (
                          <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-[9px]">
                            {p.name?.[0] || "?"}
                          </div>
                        )}
                      </div>
                    ))}
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
