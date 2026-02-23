import { api } from "../../../api/axios";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Timer, Users, CheckCircle, History, X, Download, Calendar, User } from "lucide-react";
import { Button } from "../../../components/ui/button";


export const AdminAttendanceTab = ({ onStart, isStarted, code, timeLeft, attendedMembers, onStop }: any) => {
  const [showHistory, setShowHistory] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  // ✨ 출석 이력 불러오기 (백엔드 /api/attendance/history 연동)
  const fetchHistory = async () => {
    try {
      const res = await api.get("/attendance/history");
      setAttendanceHistory(res.data);
      setShowHistory(true);
    } catch (e) {
      console.error("이력 로드 실패", e);
      alert("출석 이력을 불러오는데 실패했습니다.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ✨ 학번 포맷팅 함수 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "";
    const strId = String(id).trim();
    if (strId.includes("학번")) return strId;
    if (strId.length === 8) return `${strId.substring(2, 4)}학번`;
    if (strId.length === 2) return `${strId}학번`;
    return `${strId}학번`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">출석 시스템</h1>
        <Button
          onClick={fetchHistory}
          className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-6 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <History size={18} /> 출석 이력 확인
        </Button>
      </div>

      {!isStarted ? (
        <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm max-w-lg text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-8">
            <Timer size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4">정기 총회 출석 시작</h2>
          <p className="text-slate-400 font-medium mb-10">5분 동안 인증번호가 활성화됩니다.</p>
          <Button onClick={onStart} className="w-full bg-indigo-600 text-white py-8 rounded-[2rem] font-black text-xl shadow-2xl">
            <Play fill="currentColor" className="mr-2" /> 지금 시작하기
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 실시간 코드 영역 */}
            <div className="bg-indigo-600 p-12 rounded-[3.5rem] text-white shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-8 right-8 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                <Timer size={18} />
                <span className="font-black text-lg">{formatTime(timeLeft)}</span>
              </div>
              <p className="text-indigo-200 font-bold uppercase mb-4 tracking-widest text-xs">Attendance Code</p>
              <h2 className="text-[120px] font-black leading-none tracking-tighter">{code}</h2>
              <Button onClick={onStop} variant="ghost" className="mt-8 text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl px-10 py-6 font-bold">
                <CheckCircle size={18} className="mr-2" /> 출석 종료 및 저장
              </Button>
            </div>

            {/* 통계 영역 */}
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
              <p className="text-slate-400 font-black uppercase mb-6 tracking-widest text-xs">Attended Members</p>
              <div className="flex items-center gap-4">
                <span className="text-[100px] font-black text-slate-900 leading-none">{attendedMembers.length}</span>
                <span className="text-2xl font-bold text-slate-300 mt-10">명</span>
              </div>
            </div>
          </div>

          {/* 실시간 보드 */}
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[300px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="text-indigo-600" size={20} /> Live Board
              </h3>
            </div>
            <div className="flex flex-wrap gap-6 justify-start">
              <AnimatePresence>
                {attendedMembers.map((member: any, idx: number) => (
                  <motion.div key={member.loginId || idx} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 group">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 border-2 border-indigo-50 overflow-hidden shadow-sm group-hover:shadow-md group-hover:border-indigo-200 transition-all">
                        <img src={member.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-full h-full object-cover" alt={member.name} />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-900 leading-none mb-1">{member.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{formatStudentId(member.studentId)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* 🕒 출석 이력 모달 */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center px-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowHistory(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><History size={24} /></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">지난 출석 기록</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 font-bold flex flex-col items-center gap-4">
                    <History size={48} className="opacity-20" />
                    저장된 출석 기록이 없습니다.
                  </div>
                ) : (
                  attendanceHistory.map((session: any) => (
                    <div key={session.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 group hover:border-indigo-200 transition-all">
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                        <div className="flex items-center gap-8">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Session Date</span>
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                              <Calendar size={18} className="text-slate-400" /> {session.date}
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Members</span>
                            <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                              <Users size={18} className="text-slate-400" /> {session.members?.length || 0}명
                            </div>
                          </div>
                        </div>
                        <Button className="bg-white text-indigo-600 border border-indigo-100 rounded-xl px-5 py-2.5 text-xs font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                          <Download size={14} className="mr-2" /> 엑셀 저장
                        </Button>
                      </div>

                      {/* 당시 출석 인원 명단 */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {session.members?.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-white px-3 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-50">
                              <img
                                src={m.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                className="w-full h-full object-cover"
                                onError={(e: any) => e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-900 truncate">{m.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 tracking-tighter">{formatStudentId(m.studentId)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};