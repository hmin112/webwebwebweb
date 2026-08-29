import { ArrowLeft, Trash2, Edit3, Trophy, CalendarDays, Award } from "lucide-react";
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

export const HallOfFameDetail = ({ onNavigate, isAdmin, isLoggedIn, entry, onDelete }: any) => {
  if (!entry) return <div className="pt-40 text-center font-bold text-slate-400">명예의 전당 게시물을 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <button
            onClick={() => onNavigate("halloffame-page")}
            className="flex items-center text-slate-400 font-bold text-sm hover:text-indigo-600 group"
          >
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 목록으로
          </button>

          {isAdmin && isLoggedIn && (
            <div className="flex gap-2">
              <Button
                onClick={() => onNavigate("halloffame-write", entry.id)}
                variant="ghost"
                className="text-indigo-600 font-bold rounded-xl flex items-center gap-2"
              >
                <Edit3 size={18} /> 수정
              </Button>
              <Button
                onClick={() => onDelete(entry.id)}
                variant="ghost"
                className="text-pink-600 font-bold rounded-xl flex items-center gap-2"
              >
                <Trash2 size={18} /> 삭제
              </Button>
            </div>
          )}
        </div>

        <header className="mb-12">
          <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-black uppercase mb-6 ${getAwardBadgeStyle(entry.awardName)}`}>
            <Trophy size={13} /> {entry.awardName}
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight leading-tight">
            {entry.title}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-3xl flex items-center gap-4">
              <Award size={20} className="text-amber-500" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Competition</p>
                <p className="font-bold text-slate-900">{entry.competitionName}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl flex items-center gap-4">
              <CalendarDays size={20} className="text-indigo-600" />
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Date</p>
                <p className="font-bold text-slate-900">{entry.date}</p>
              </div>
            </div>
          </div>
        </header>

        {entry.image && (
          <div className="rounded-[3rem] overflow-hidden mb-16 shadow-xl border border-slate-50">
            <img src={entry.image} alt={entry.title} className="w-full h-auto" />
          </div>
        )}

        {entry.content && (
          <article className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium mb-16">
            {entry.content}
          </article>
        )}

        {entry.participants && entry.participants.length > 0 && (
          <div className="pt-10 border-t border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">수상자</p>
            <div className="flex flex-wrap gap-3">
              {entry.participants.map((p: any) => (
                <div key={p.loginId} className="flex items-center gap-3 bg-slate-50 rounded-2xl pl-2 pr-5 py-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-100 shrink-0">
                    {p.profileImage ? (
                      <img src={p.profileImage} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-indigo-500 font-bold text-sm">{p.name?.[0] || "?"}</div>
                    )}
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{formatStudentId(p.studentId)} {p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
