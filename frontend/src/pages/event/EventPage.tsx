import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, MapPin, Plus, Eye, Heart } from "lucide-react";
import { Button } from "../../components/ui/button";
 // ✨ axios 추가

// ✨ user(로그인 정보)와 setEvents(상태 업데이트 함수)를 props로 받습니다.
export const EventPage = ({ onNavigate, isAdmin, isLoggedIn, events, user, setEvents }: any) => {

  // ✨ 좋아요 처리 핸들러
  const handleLike = async (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation(); // 카드 전체 클릭(상세페이지 이동) 이벤트 전파 방지

    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다. 🔒");
      return;
    }

    try {
      const response = await api.post(`/events/${eventId}/like`);

      if (response.data.status === "success") {
        // ✨ 성공 시, 상위 컴포넌트의 events 상태를 업데이트하여 화면에 즉시 반영
        const updatedEvents = events.map((event: any) =>
          event.id === eventId
            ? { ...event, likes: response.data.likeCount }
            : event
        );
        setEvents(updatedEvents);
      }
    } catch (error) {
      console.error("좋아요 처리 중 오류 발생:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={32} /> 주요 행사
            </h1>
            <p className="text-slate-500 font-medium mt-2">DEVSIGN의 역동적인 활동 기록입니다.</p>
          </div>

          {isLoggedIn && isAdmin && (
            <Button
              onClick={() => onNavigate("event-write")}
              className="bg-indigo-600 text-white font-bold px-8 py-6 rounded-2xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={20} /> 행사 등록
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {events && events.map((event: any) => (
            <motion.div
              key={event.id}
              whileHover={{ y: -10 }}
              onClick={() => onNavigate("event-detail", event.id)}
              className="group cursor-pointer bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 overflow-hidden"
            >
              <div className="relative h-56 overflow-hidden">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">
                    {event.category}
                  </span>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6 group-hover:text-indigo-600 transition-colors line-clamp-1">{event.title}</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                    <Calendar size={14} /> {event.date}
                  </div>
                  <div className="flex items-center gap-3 text-slate-300 font-bold text-[11px]">
                    <MapPin size={14} /> {event.location}
                  </div>
                </div>

                {/* 조회수 및 좋아요 표시 영역 */}
                <div className="flex items-center justify-end gap-4 pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px]">
                    <Eye size={14} /> {event.views || 0}
                  </div>

                  {/* ✨ 좋아요 버튼: 하트 색상을 조회수와 동일하게 회색으로 유지 */}
                  <button
                    onClick={(e) => handleLike(e, event.id)}
                    className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] hover:text-pink-500 transition-colors"
                  >
                    <Heart size={14} />
                    {event.likes || 0}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};