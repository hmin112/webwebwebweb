import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Trash2, Edit3, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";

export const NoticeDetail = ({ onNavigate, isAdmin, isLoggedIn, notice, onDelete, user, setNotice }: any) => {

  useEffect(() => {
    if (isLoggedIn && notice?.id) {
      const updateNoticeView = async () => {
        try {
          const response = await api.get(`/notices/${notice.id}`);
          if (response.data) {
            setNotice(response.data);
          }
        } catch (error) {
          console.error("공지사항 조회수 업데이트 실패:", error);
        }
      };
      updateNoticeView();
    }
  }, [notice?.id, isLoggedIn, setNotice]);

  if (!notice) return <div className="pt-40 text-center font-bold text-slate-400">공지사항을 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-20 pt-20 md:pt-32 font-sans">
      <div className="max-w-4xl mx-auto px-4 md:px-6">

        <div className="flex justify-between items-start mb-6 md:mb-8">
          <button 
            onClick={() => onNavigate("notice-page")} 
            className="flex items-center text-slate-400 font-bold text-xs md:text-sm hover:text-indigo-600 transition-colors group whitespace-nowrap mt-1 md:mt-2"
          >
            <ArrowLeft className="w-4 h-4 md:w-[18px] md:h-[18px] mr-1.5 md:mr-2 group-hover:-translate-x-1 transition-transform shrink-0" /> 목록으로 돌아가기
          </button>

          <div className="flex flex-col items-end gap-1.5 md:gap-2">
            {isAdmin && isLoggedIn && (
              <div className="flex gap-1 md:gap-2">
                <Button
                  onClick={() => onNavigate("notice-write", notice.id)}
                  variant="ghost"
                  className="text-indigo-600 font-bold rounded-lg md:rounded-xl hover:bg-indigo-50 flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 text-[11px] md:text-sm h-8 md:h-10"
                >
                  <Edit3 className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> 수정
                </Button>
                <Button
                  onClick={() => onDelete(notice.id)}
                  variant="ghost"
                  className="text-pink-600 font-bold rounded-lg md:rounded-xl hover:bg-pink-50 flex items-center gap-1 md:gap-2 px-2 py-1 md:px-4 md:py-2 text-[11px] md:text-sm h-8 md:h-10"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" /> 삭제
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-xs pr-2 md:pr-4">
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" /> {notice.views || 0}
            </div>
          </div>
        </div>

        <header className="mb-8 md:mb-12">
          <div className="inline-block px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] md:text-[11px] font-black uppercase mb-4 md:mb-6">
            {notice.category || notice.tag || "일반"}
          </div>
          <h1 className="text-2xl md:text-5xl font-[900] text-slate-900 tracking-tight mb-6 md:mb-8 leading-tight">{notice.title}</h1>
          <div className="flex items-center gap-4 md:gap-6 text-slate-400 font-medium text-xs md:text-sm border-y border-slate-50 py-4 md:py-6">
            <div className="flex items-center gap-1.5 md:gap-2">
              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />
              <span className="text-slate-600 font-bold">{notice.author || "관리자"}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span>{notice.date}</span>
            </div>
          </div>
        </header>

        <article className="mb-16 md:mb-20">
          <div className="text-slate-600 text-sm md:text-lg leading-relaxed whitespace-pre-wrap font-medium mb-8 md:mb-12">
            {notice.content}
          </div>

          {notice.images && notice.images.length > 0 && (
            <div className="flex flex-col gap-4 md:gap-8">
              {notice.images.map((img: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                  <img src={img} alt={`notice-attached-${idx}`} className="w-full h-auto object-cover" />
                </motion.div>
              ))}
            </div>
          )}
        </article>

        <div className="flex justify-center border-t border-slate-100 pt-10 md:pt-16">
          <Button onClick={() => onNavigate("notice-page")} className="px-8 py-5 md:px-12 md:py-7 rounded-xl md:rounded-2xl bg-slate-900 text-white text-sm md:text-base font-bold shadow-xl active:scale-95 transition-all">목록으로</Button>
        </div>
      </div>
    </div>
  );
};