import { api } from "../../api/axios";
import { useState, useEffect } from "react"; 
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowLeft, Trash2, Edit3, Heart, Eye } from "lucide-react";
import { Button } from "../../components/ui/button";
 

export const EventDetail = ({ onNavigate, isAdmin, isLoggedIn, event, onDelete, user, setEvent }: any) => {
  // ✨ 좋아요 상태를 서버 데이터와 동기화하기 위한 로컬 상태
  const [liked, setLiked] = useState(false);

  // ✨ [상세 데이터 및 좋아요 상태 로드] 컴포넌트 마운트 시 실행
  useEffect(() => {
    if (isLoggedIn && user?.loginId && event?.id) {
      const fetchEventDetail = async () => {
        try {
          // 백엔드 엔드포인트에 loginId를 전달하여 상세 정보와 좋아요 여부를 함께 가져옴
          const response = await api.get(`/events/${event.id}?loginId=${user.loginId}`);
          
          if (response.data) {
            // 백엔드 반환 구조 { event: ..., isLiked: ... }에 맞춤
            setEvent(response.data.event); 
            setLiked(response.data.isLiked); // ✨ 새로고침 시에도 서버 데이터를 바탕으로 핑크색 유지
          }
        } catch (error) {
          console.error("데이터 로드 중 오류 발생:", error);
        }
      };
      fetchEventDetail();
    }
  }, [event?.id, isLoggedIn, user?.loginId, setEvent]);

  if (!event) return <div className="pt-40 text-center font-bold text-slate-400">행사를 찾을 수 없습니다.</div>;

  // ✨ [좋아요 로직] 클릭 시 서버 데이터베이스와 연동
  const handleLikeClick = async () => {
    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다. 🔒");
      return;
    }

    try {
      // 서버의 toggleLike 엔드포인트 호출
      const response = await api.post(`/events/${event.id}/like`, {
        loginId: user.loginId
      });

      if (response.data.status === "success") {
        // 서버 응답 결과에 따라 하트 색상 및 숫자 업데이트
        setLiked(response.data.liked);
        setEvent({
          ...event,
          likes: response.data.likeCount
        });
      } else {
        alert(`오류: ${response.data.message || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error("좋아요 처리 중 오류 발생:", error);
      if (error.response) {
        console.log("서버 에러 상세:", error.response.data);
      }
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 pt-32">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex justify-between items-center mb-10">
          <button 
            onClick={() => onNavigate("event-page")} 
            className="flex items-center text-slate-400 font-bold text-sm hover:text-indigo-600 group"
          >
            <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 목록으로
          </button>
          
          <div className="flex items-center gap-6">
            {/* 조회수 표시 */}
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-xs">
              <Eye size={16} /> {event.views || 0}
            </div>
            {isAdmin && isLoggedIn && (
              <div className="flex gap-2 border-l border-slate-100 pl-4">
                <Button 
                  onClick={() => onNavigate("event-write", event.id)} 
                  variant="ghost" 
                  className="text-indigo-600 font-bold rounded-xl flex items-center gap-2"
                >
                  <Edit3 size={18} /> 수정
                </Button>
                <Button 
                  onClick={() => onDelete(event.id)} 
                  variant="ghost" 
                  className="text-pink-600 font-bold rounded-xl flex items-center gap-2"
                >
                  <Trash2 size={18} /> 삭제
                </Button>
              </div>
            )}
          </div>
        </div>
        
        <header className="mb-12">
          <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-black uppercase mb-6">
            {event.category}
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-10 tracking-tight leading-tight">
            {event.title}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-3xl flex items-center gap-4">
              <Calendar size={20} className="text-indigo-600" /> 
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Date</p>
                <p className="font-bold text-slate-900">{event.date}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl flex items-center gap-4">
              <MapPin size={20} className="text-pink-500" /> 
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Location</p>
                <p className="font-bold text-slate-900">{event.location}</p>
              </div>
            </div>
          </div>
        </header>

        {event.image && (
          <div className="rounded-[3rem] overflow-hidden mb-16 shadow-xl border border-slate-50">
            <img src={event.image} alt={event.title} className="w-full h-auto" />
          </div>
        )}

        <article className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap font-medium mb-16">
          {event.content}
        </article>

        <div className="flex items-center justify-center pt-10 border-t border-slate-100">
          <Button 
            onClick={handleLikeClick}
            className={`rounded-2xl px-12 py-8 font-black transition-all flex items-center gap-3 text-lg ${
              liked 
                ? "bg-pink-50 text-pink-500 hover:bg-pink-100 shadow-lg shadow-pink-100" 
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <Heart size={24} fill={liked ? "currentColor" : "none"} />
            좋아요 {event.likes || 0}
          </Button>
        </div>
      </div>
    </div>
  );
};