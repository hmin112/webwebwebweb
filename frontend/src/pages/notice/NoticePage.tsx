import { api } from "../../api/axios";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone, Calendar, ChevronRight, Search,
  Plus, Eye, Pin
} from "lucide-react";
import { Button } from "../../components/ui/button";

export const NoticePage = ({
  onNavigate,
  isAdmin,
  isLoggedIn,
  notices,
  user,
  fetchNotices
}: {
  onNavigate: (page: string, id?: number) => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
  notices: any[];
  user?: any;
  fetchNotices?: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return notices;

    return notices.filter((notice) => {
      const candidates = [
        notice?.title,
        notice?.author,
        notice?.tag,
        notice?.category,
        notice?.content
      ];

      return candidates.some(
        (value) => typeof value === "string" && value.toLowerCase().includes(query)
      );
    });
  }, [notices, searchQuery]);

  const handleTogglePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    try {
      const response = await api.put(`/notices/${id}/pin`);

      if (response.data.status === "success") {
        if (fetchNotices) await fetchNotices();
      } else if (response.data.status === "error") {
        alert(response.data.message); 
      }
    } catch (error) {
      console.error("고정 설정 실패:", error);
      alert("고정 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-20 pt-24 md:pt-32">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
              <Megaphone className="text-indigo-600 w-6 h-6 md:w-8 md:h-8" /> 공지사항
            </h1>
            <p className="text-slate-500 font-medium mt-1 md:mt-2 text-[11px] md:text-base">DEVSIGN의 주요 소식을 전해드립니다.</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 md:w-[18px] md:h-[18px]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full pl-9 md:pl-11 pr-3 md:pr-4 py-2 md:py-3 bg-slate-50 border-none rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-[11px] md:text-sm"
              />
            </div>

            {isLoggedIn && isAdmin && (
              <Button
                onClick={() => onNavigate("notice-write")}
                className="bg-indigo-600 text-white font-bold px-3 py-2 md:px-6 md:py-6 rounded-xl md:rounded-2xl shadow-lg flex items-center gap-1.5 md:gap-2 transition-all active:scale-95 text-[11px] md:text-base shrink-0"
              >
                <Plus className="w-3.5 h-3.5 md:w-5 md:h-5" /> <span className="hidden sm:inline">공지 작성</span>
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filteredNotices.map((notice) => (
              <motion.div
                key={notice.id}
                whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                onClick={() => onNavigate("notice-detail", notice.id)}
                className="group flex flex-col md:flex-row items-start md:items-center p-4 md:p-8 cursor-pointer transition-colors relative bg-white"
              >
                {notice.pinned && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 hidden md:block">
                    <Pin size={16} fill="currentColor" />
                  </div>
                )}

                <div className="flex items-center gap-2 md:gap-4 mb-2 md:mb-0 md:w-32">
                  <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[11px] font-black uppercase ${notice.tag === "모집" ? "bg-indigo-50 text-indigo-600" :
                      notice.tag === "행사" ? "bg-pink-50 text-pink-600" :
                        "bg-slate-100 text-slate-500"
                    }`}>{notice.tag}</span>
                </div>

                <div className="flex-1 mb-2 md:mb-0 flex items-center gap-2 md:gap-3 w-full pr-4 md:pr-0">
                  <h3 className="text-[13px] md:text-lg font-bold transition-colors text-slate-800 group-hover:text-indigo-600 line-clamp-1 md:line-clamp-none flex-1">
                    {notice.title}
                  </h3>
                  {notice.pinned && <Pin className="w-3.5 h-3.5 md:hidden text-indigo-400 shrink-0" fill="currentColor" />}
                </div>

                <div className="flex items-center gap-4 md:gap-6 text-[10px] md:text-sm text-slate-400 font-medium w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-1 md:gap-2"><Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" /> {notice.date}</div>
                    <span className="hidden md:block w-24 text-right">{notice.author}</span>

                    <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 min-w-[30px] md:min-w-[40px] justify-end">
                      <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" /> {notice.views || 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleTogglePin(e, notice.id)}
                        className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all ${notice.pinned
                            ? "bg-indigo-100 text-indigo-600 shadow-inner"
                            : "bg-slate-50 text-slate-300 hover:text-indigo-400 hover:bg-indigo-50"
                          }`}
                        title={notice.pinned ? "고정 해제" : "상단 고정 (최대 3개)"}
                      >
                        <Pin className="w-3 h-3 md:w-4 md:h-4" fill={notice.pinned ? "currentColor" : "none"} />
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 md:w-[18px] md:h-[18px] text-slate-200 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredNotices.length === 0 && (
              <div className="py-12 md:py-20 text-center">
                <p className="text-slate-400 font-bold text-xs md:text-base">
                  {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 공지사항이 없습니다."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};