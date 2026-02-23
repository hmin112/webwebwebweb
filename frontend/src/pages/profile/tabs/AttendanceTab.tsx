import { api } from "../../../api/axios";
import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";


// ✨ user 및 attendedMembers 프롭이 반드시 전달되어야 합니다.
export const AttendanceTab = ({ isActive, correctCode, onSuccess, user, attendedMembers }: any) => {
  const [inputCode, setInputCode] = useState("");
  const [status, setStatus] = useState("idle");

  // ✨ [추가] 학번 포맷팅 함수 (8자리/2자리/이미 포함된 경우 모두 대응)
  const formatStudentId = (id: string) => {
    if (!id) return "";
    const strId = String(id).trim();
    if (strId.includes("학번")) return strId;
    if (strId.length === 8) return `${strId.substring(2, 4)}학번`;
    if (strId.length === 2) return `${strId}학번`;
    return `${strId}학번`;
  };

  // ✨ [추가] 서버에서 3초마다 받아오는 명단에 내가 이미 있는지 확인 (실시간 동기화 대응)
  const isAlreadyAttended = attendedMembers?.some(
    (member: any) => member.loginId === user?.loginId
  );

  const handleSubmit = async () => {
    if (inputCode === correctCode) {
      try {
        // ✨ 서버로 보낼 데이터 패키징 (학번 포맷팅 및 이미지 포함)
        const attendanceData = {
          loginId: user?.loginId || "unknown",
          name: user?.name || "이름 없음",
          studentId: formatStudentId(user?.studentId), // 수정된 학번 적용
          avatar: user?.avatarUrl || user?.profileImage || "https://cdn.discordapp.com/embed/avatars/0.png"
        };

        // 서버에 출석 정보 제출 (실시간 메모리 업데이트용)
        await api.post("/attendance/submit", attendanceData);

        setStatus("success");

        if (onSuccess) {
          onSuccess(attendanceData);
        }
      } catch (error) {
        console.error("출석 제출 실패:", error);
        alert("출석 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
        setStatus("error");
        setTimeout(() => setStatus("idle"), 2000);
      }
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  if (!isActive) return (
    <div className="h-[500px] flex flex-col items-center justify-center text-slate-300">
      <KeyRound size={64} className="mb-6 opacity-20" />
      <p className="text-xl font-bold">진행 중인 출석 체크가 없습니다.</p>
    </div>
  );

  // ✨ [추가] 서버 명단에 내가 있거나, 방금 성공했다면 완료 화면 고정
  if (isAlreadyAttended || status === "success") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto pt-10 px-4">
        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl text-center">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center bg-green-100 text-green-600">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">출석 완료</h2>
          <p className="text-slate-400 font-bold mb-8 uppercase text-[10px] tracking-widest">Check-in Verified</p>
          <div className="py-6 bg-slate-50 rounded-3xl text-slate-500 font-bold">
            정상적으로 출석 처리되었습니다.
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto pt-10 px-4">
      <div className="bg-white p-10 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl text-center">
        <div className={`w-20 h-20 rounded-3xl mx-auto mb-8 flex items-center justify-center ${status === "error" ? "bg-red-100 text-red-600" : "bg-indigo-50 text-indigo-600"
          }`}>
          {status === "error" ? <AlertCircle size={40} /> : <KeyRound size={40} />}
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">인증번호 입력</h2>
        <p className="text-slate-400 font-bold mb-8 uppercase text-[10px] tracking-widest">Enter 3-Digit Code</p>

        <input
          type="text"
          maxLength={3}
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ""))}
          className="w-full text-center text-6xl font-black py-8 bg-slate-50 rounded-3xl outline-none tracking-[0.2em] mb-8 focus:ring-2 focus:ring-indigo-500 transition-all"
          placeholder="000"
        />

        <Button
          onClick={handleSubmit}
          disabled={inputCode.length < 3}
          className="w-full bg-indigo-600 text-white py-8 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all"
        >
          확인
        </Button>
      </div>
    </motion.div>
  );
};