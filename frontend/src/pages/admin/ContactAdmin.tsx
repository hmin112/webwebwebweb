import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, ArrowLeft, HelpCircle, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "../../components/ui/button";

const CATEGORIES = [
  { id: "join", label: "가입 문의", icon: <HelpCircle size={18} /> },
  { id: "bug", label: "오류 제보", icon: <Bug size={18} /> },
  { id: "suggest", label: "건의 사항", icon: <Lightbulb size={18} /> },
  { id: "other", label: "기타 문의", icon: <MessageSquare size={18} /> },
];

export const ContactAdmin = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [selectedCategory, setSelectedCategory] = useState("join");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8faff] to-white px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        
        <button 
          onClick={() => onNavigate("home")} 
          className="flex items-center text-slate-400 font-bold text-sm mb-8 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" /> 메인으로 돌아가기
        </button>

        <div className="bg-white rounded-[40px] shadow-2xl shadow-indigo-100/50 border border-slate-100 p-10 md:p-12">
          <div className="mb-12">
            <h1 className="text-3xl font-black text-slate-900 mb-2">운영진에게 문의하기</h1>
            <p className="text-slate-500 font-medium leading-relaxed">
              궁금한 점이나 건의사항을 남겨주시면 운영진이 확인 후<br /> 
              디스코드 혹은 연락처를 통해 답변해 드릴게요. 💬
            </p>
          </div>

          <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
            
            {/* 카테고리 선택 */}
            <section className="space-y-4">
              <label className="text-sm font-black text-slate-700 ml-1">문의 유형</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                      selectedCategory === cat.id 
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-600 shadow-sm" 
                      : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100"
                    }`}
                  >
                    {cat.icon}
                    <span className="text-xs font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* 문의 본문 */}
            <section className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">문의 제목</label>
                <input 
                  type="text" 
                  placeholder="제목을 입력해주세요"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 ml-1">문의 내용</label>
                <textarea 
                  rows={6}
                  placeholder="내용을 상세하게 입력해주시면 더 정확한 답변이 가능합니다."
                  className="w-full p-6 bg-slate-50 border-none rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium resize-none"
                />
              </div>
            </section>

            {/* 제출 버튼 */}
            <Button className="w-full py-8 rounded-[2rem] bg-indigo-600 text-white font-bold text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
              문의 보내기 <Send size={20} />
            </Button>
          </form>

          {/* 하단 디스코드 링크 안내 */}
          <div className="mt-12 pt-10 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-sm font-medium mb-4">더 빠른 답변을 원하시나요?</p>
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity">
              <MessageCircle size={18} /> DEVSIGN 공식 디스코드 가기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};