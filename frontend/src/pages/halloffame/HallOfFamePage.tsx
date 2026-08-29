import { motion } from "framer-motion";
import { Trophy, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";

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

export const HallOfFamePage = ({ onNavigate, isAdmin, isLoggedIn, entries }: any) => {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-20 pt-24 md:pt-32">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-row justify-between items-center mb-8 md:mb-16 gap-2 md:gap-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
              <Trophy className="text-amber-500 w-6 h-6 md:w-8 md:h-8 shrink-0" /> <span className="truncate">명예의 전당</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 md:mt-2 text-[11px] md:text-base line-clamp-1 md:line-clamp-none">대회에서 수상한 DEVSIGN 부원들의 기록입니다.</p>
          </div>

          {isLoggedIn && isAdmin && (
            <Button
              onClick={() => onNavigate("halloffame-write")}
              className="shrink-0 bg-indigo-600 text-white font-bold px-3 py-2 md:px-8 md:py-6 rounded-xl md:rounded-2xl shadow-lg flex items-center gap-1 md:gap-2 transition-all active:scale-95 text-[11px] md:text-base"
            >
              <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" /> 수상 등록
            </Button>
          )}
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="rounded-[2rem] border border-dashed border-slate-200 py-24 text-center text-slate-300 font-bold">
            아직 등록된 수상 소식이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10">
            {entries.map((entry: any) => (
              <motion.div
                key={entry.id}
                whileHover={{ y: -10 }}
                onClick={() => onNavigate("halloffame-detail", entry.id)}
                className="group cursor-pointer bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-amber-100/30 transition-all duration-500 overflow-hidden"
              >
                <div className="relative h-40 md:h-56 overflow-hidden">
                  {entry.image ? (
                    <img src={entry.image} alt={entry.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                      <Trophy className="w-10 h-10 text-amber-200" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 md:top-6 md:left-6">
                    <span className={`px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-black ${getAwardBadgeStyle(entry.awardName)}`}>
                      {entry.awardName}
                    </span>
                  </div>
                </div>
                <div className="p-5 md:p-8">
                  <h3 className="text-base md:text-xl font-bold text-slate-900 mb-1.5 md:mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{entry.title}</h3>
                  <p className="text-slate-400 font-bold text-[11px] md:text-xs mb-4 md:mb-6 line-clamp-1">{entry.competitionName} · {entry.date}</p>

                  {entry.participants && entry.participants.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-4 md:pt-5 border-t border-slate-50">
                      {entry.participants.map((p: any) => (
                        <div key={p.loginId} className="flex items-center gap-1.5 bg-slate-50 rounded-full pl-1 pr-2.5 py-1">
                          <div className="w-5 h-5 rounded-full overflow-hidden bg-indigo-100 shrink-0">
                            {p.profileImage ? (
                              <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-[8px]">{p.name?.[0] || "?"}</div>
                            )}
                          </div>
                          <span className="text-[10px] md:text-[11px] font-bold text-slate-600">{formatStudentId(p.studentId)} {p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
