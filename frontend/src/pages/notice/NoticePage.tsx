import { api } from "../../api/axios";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Megaphone, Calendar, ChevronRight, Search,
  Plus, Eye, Pin
} from "lucide-react";
import { Button } from "../../components/ui/button";


// ✨ user(로그인 정보)와 fetchNotices(목록 갱신 함수)를 props로 받아 고정 로직을 처리합니다.
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

  // ✨ 상단 고정 토글 핸들러 (즉각적인 상태 반영 포함)
  const handleTogglePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // 상세 페이지 이동 방지
    try {
      const response = await api.put(`/notices/${id}/pin`);

      if (response.data.status === "success") {
        // ✨ 고정 성공 시 즉시 부모 컴포넌트의 fetchNotices를 호출하여 화면을 갱신합니다.
        if (fetchNotices) await fetchNotices();
      } else if (response.data.status === "error") {
        alert(response.data.message); // "최대 3개까지만 가능합니다" 알림
      }
    } catch (error) {
      console.error("고정 설정 실패:", error);
      alert("고정 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Megaphone className="text-indigo-600" size={32} /> 공지사항
            </h1>
            <p className="text-slate-500 font-medium mt-2">DEVSIGN의 주요 소식을 전해드립니다.</p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="검색어를 입력하세요"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
              />
            </div>

            {isLoggedIn && isAdmin && (
              <Button
                onClick={() => onNavigate("notice-write")}
                className="bg-indigo-600 text-white font-bold px-6 py-6 rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={20} /> <span className="hidden sm:inline">공지 작성</span>
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {filteredNotices.map((notice) => (
              <motion.div
                key={notice.id}
                whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                onClick={() => onNavigate("notice-detail", notice.id)}
                className="group flex flex-col md:flex-row items-start md:items-center p-8 cursor-pointer transition-colors relative bg-white" // ✨ 박스 배경색을 일반과 동일하게 유지
              >
                {/* ✨ 리스트 좌측 고정 핀 아이콘 (목록 내 표시) */}
                {notice.pinned && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 hidden md:block">
                    <Pin size={16} fill="currentColor" />
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4 md:mb-0 md:w-32">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${notice.tag === "모집" ? "bg-indigo-50 text-indigo-600" :
                      notice.tag === "행사" ? "bg-pink-50 text-pink-600" :
                        "bg-slate-100 text-slate-500"
                    }`}>{notice.tag}</span>
                </div>

                <div className="flex-1 mb-4 md:mb-0 flex items-center gap-3">
                  <h3 className="text-lg font-bold transition-colors text-slate-800 group-hover:text-indigo-600">
                    {notice.title}
                  </h3>
                  {/* 모바일용 핀 표시 */}
                  {notice.pinned && <Pin size={14} className="text-indigo-400 md:hidden" fill="currentColor" />}
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-400 font-medium w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><Calendar size={14} /> {notice.date}</div>
                    <span className="hidden md:block w-24 text-right">{notice.author}</span>

                    <div className="flex items-center gap-1.5 text-slate-300 min-w-[40px] justify-end">
                      <Eye size={14} /> {notice.views || 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* ✨ 관리자용 고정/해제 버튼 */}
                    {isAdmin && (
                      <button
                        onClick={(e) => handleTogglePin(e, notice.id)}
                        className={`p-2 rounded-xl transition-all ${notice.pinned
                            ? "bg-indigo-100 text-indigo-600 shadow-inner"
                            : "bg-slate-50 text-slate-300 hover:text-indigo-400 hover:bg-indigo-50"
                          }`}
                        title={notice.pinned ? "고정 해제" : "상단 고정 (최대 3개)"}
                      >
                        <Pin size={16} fill={notice.pinned ? "currentColor" : "none"} />
                      </button>
                    )}
                    <ChevronRight size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredNotices.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-slate-400 font-bold">
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
