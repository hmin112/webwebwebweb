import { api } from "../../api/axios";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Calendar, MapPin, Plus, Eye, Heart } from "lucide-react";
import { Button } from "../../components/ui/button";

export const EventPage = ({ onNavigate, isAdmin, isLoggedIn, events, user, setEvents }: any) => {

  const handleLike = async (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation();

    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다. 🔒");
      return;
    }

    try {
      const response = await api.post(`/events/${eventId}/like`);

      if (response.data.status === "success") {
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
    <div className="min-h-screen bg-white pb-16 md:pb-20 pt-24 md:pt-32">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-row justify-between items-center mb-8 md:mb-16 gap-2 md:gap-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
              <Sparkles className="text-indigo-600 w-6 h-6 md:w-8 md:h-8 shrink-0" /> <span className="truncate">주요 행사</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1 md:mt-2 text-[11px] md:text-base line-clamp-1 md:line-clamp-none">DEVSIGN의 역동적인 활동 기록입니다.</p>
          </div>

          {isLoggedIn && isAdmin && (
            <Button
              onClick={() => onNavigate("event-write")}
              className="shrink-0 bg-indigo-600 text-white font-bold px-3 py-2 md:px-8 md:py-6 rounded-xl md:rounded-2xl shadow-lg flex items-center gap-1 md:gap-2 transition-all active:scale-95 text-[11px] md:text-base"
            >
              <Plus className="w-3.5 h-3.5 md:w-5 md:h-5 shrink-0" /> 행사 등록
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10">
          {events && events.map((event: any) => (
            <motion.div
              key={event.id}
              whileHover={{ y: -10 }}
              onClick={() => onNavigate("event-detail", event.id)}
              className="group cursor-pointer bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 overflow-hidden"
            >
              <div className="relative h-40 md:h-56 overflow-hidden">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute top-4 left-4 md:top-6 md:left-6">
                  <span className="px-3 py-1.5 md:px-4 md:py-1.5 rounded-full bg-indigo-600 text-white text-[9px] md:text-[10px] font-black uppercase">
                    {event.category}
                  </span>
                </div>
              </div>
              <div className="p-5 md:p-8">
                <h3 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-6 group-hover:text-indigo-600 transition-colors line-clamp-1">{event.title}</h3>
                <div className="space-y-1.5 md:space-y-3 mb-4 md:mb-6">
                  <div className="flex items-center gap-2 md:gap-3 text-slate-500 text-[11px] md:text-xs font-bold">
                    <Calendar className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {event.date}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 text-slate-400 font-bold text-[10px] md:text-[11px]">
                    <MapPin className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {event.location}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 md:gap-4 pt-4 md:pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-[11px]">
                    <Eye className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" /> {event.views || 0}
                  </div>

                  <button
                    onClick={(e) => handleLike(e, event.id)}
                    className="flex items-center gap-1 md:gap-1.5 text-slate-300 font-bold text-[10px] md:text-[11px] hover:text-pink-500 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5 md:w-[14px] md:h-[14px]" />
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