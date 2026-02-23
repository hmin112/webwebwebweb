import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Trash2, Edit3, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";


// ✨ props에 isLoggedIn, user, setNotice를 추가하여 상위 상태와 연동합니다.
export const NoticeDetail = ({ onNavigate, isAdmin, isLoggedIn, notice, onDelete, user, setNotice }: any) => {

  // ✨ [조회수 업데이트 로직] 상세 페이지 진입 시 백엔드에 조회수 증가 요청
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
    <div className="min-h-screen bg-white pb-20 pt-32 font-sans">
      <div className="max-w-4xl mx-auto px-6">

        <div className="flex justify-between items-center mb-8">
          <button onClick={() => onNavigate("notice-page")} className="flex items-center text-slate-400 font-bold text-sm hover:text-indigo-600 transition-colors group">
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 목록으로 돌아가기
          </button>

          <div className="flex items-center gap-6">
            {/* ✨ 조회수 표시 (Eye 아이콘) 추가 */}
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
              <Eye size={16} /> {notice.views || 0}
            </div>

            {/* 관리자 전용 액션 버튼: 로그인 상태와 관리자 여부 동시 확인 */}
            {isAdmin && isLoggedIn && (
              <div className="flex gap-2 border-l border-slate-100 pl-4">
                <Button
                  onClick={() => onNavigate("notice-write", notice.id)}
                  variant="ghost"
                  className="text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 flex items-center gap-2"
                >
                  <Edit3 size={18} /> 수정
                </Button>
                <Button
                  onClick={() => onDelete(notice.id)}
                  variant="ghost"
                  className="text-pink-600 font-bold rounded-xl hover:bg-pink-50 flex items-center gap-2"
                >
                  <Trash2 size={18} /> 삭제
                </Button>
              </div>
            )}
          </div>
        </div>

        <header className="mb-12">
          {/* ✨ 태그(모집, 공지, 행사) 표시: category 필드를 우선적으로 사용 */}
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-black uppercase mb-6">
            {notice.category || notice.tag || "일반"}
          </div>
          <h1 className="text-4xl md:text-5xl font-[900] text-slate-900 tracking-tight mb-8 leading-tight">{notice.title}</h1>
          <div className="flex items-center gap-6 text-slate-400 font-medium text-sm border-y border-slate-50 py-6">
            {/* ✨ 작성자 이름: notice.author를 통해 실제 이름을 표시 */}
            <div className="flex items-center gap-2">
              <User size={16} className="text-indigo-400" />
              <span className="text-slate-600 font-bold">{notice.author || "관리자"}</span>
            </div>
            <div className="flex items-center gap-2"><Calendar size={16} /> <span>{notice.date}</span></div>
          </div>
        </header>

        <article className="mb-20">
          {/* 본문 텍스트 */}
          <div className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium mb-12">
            {notice.content}
          </div>

          {/* ✨ 이미지 섹션: 기존 디자인 유지 */}
          {notice.images && notice.images.length > 0 && (
            <div className="flex flex-col gap-8">
              {notice.images.map((img: string, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                  <img src={img} alt={`notice-attached-${idx}`} className="w-full h-auto object-cover" />
                </motion.div>
              ))}
            </div>
          )}
        </article>

        <div className="flex justify-center border-t border-slate-100 pt-16">
          <Button onClick={() => onNavigate("notice-page")} className="px-12 py-7 rounded-2xl bg-slate-900 text-white font-bold shadow-xl active:scale-95 transition-all">목록으로</Button>
        </div>
      </div>
    </div>
  );
};