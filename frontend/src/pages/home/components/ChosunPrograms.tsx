import { motion } from "framer-motion";
import { GraduationCap, ArrowRight, ExternalLink, CalendarClock } from "lucide-react";

interface ChosunProgram {
  title: string;
  category: string;
  imageUrl: string;
  applyUrl: string;
  applyPeriod: string;
  period: string;
}

// 조선대학교 SW중심대학사업단 "지원프로그램" 페이지에서 실시간으로 긁어온(백엔드가 30분마다 갱신)
// 신청 가능한 프로그램 목록을 홈 화면에 미리보기로 노출. 클릭하면 원본 신청 페이지로 새 탭 이동.
export const ChosunPrograms = ({ programs }: { programs: ChosunProgram[] }) => {
  if (!programs || programs.length === 0) return null;

  const preview = programs.slice(0, 4);

  return (
    <section className="py-10 md:py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-row justify-between items-end mb-8 md:mb-16 gap-4 md:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs md:text-sm mb-3 md:mb-4">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5" /> 조선대 SW중심대학
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">지원 프로그램 신청</h2>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-bold">
              지금 신청 가능한 교육/대회/튜터/멤버십 프로그램이에요
            </p>
          </div>
          <a
            href="https://sw.chosun.ac.kr/main/menu?gc=Program"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 md:gap-2 text-slate-400 font-bold hover:text-indigo-600 transition-colors group text-sm md:text-base pb-1 md:pb-0"
          >
            전체보기 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {preview.map((program, index) => (
            <motion.a
              key={program.applyUrl}
              href={program.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="group cursor-pointer block"
            >
              <div className="relative w-full aspect-square rounded-2xl md:rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 mb-3 md:mb-4 bg-white">
                <img
                  src={program.imageUrl}
                  alt={program.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {program.category && (
                  <div className="absolute top-2 left-2 md:top-4 md:left-4">
                    <span className="px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-lg md:rounded-full text-[10px] md:text-xs font-black bg-indigo-600 text-white shadow-lg shadow-indigo-300/50">
                      {program.category}
                    </span>
                  </div>
                )}
                <div className="absolute top-2 right-2 md:top-4 md:right-4 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center shadow-md">
                  <ExternalLink className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-600" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/70 to-transparent p-2.5 md:p-4">
                  <span className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-full text-[10px] md:text-xs font-black bg-white text-indigo-600">
                    신청하기
                  </span>
                </div>
              </div>

              <h3 className="text-sm md:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-1">
                {program.title}
              </h3>

              {program.applyPeriod && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] md:text-xs text-slate-400 font-bold">
                  <CalendarClock className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                  <span className="truncate">{program.applyPeriod}</span>
                </div>
              )}
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};
