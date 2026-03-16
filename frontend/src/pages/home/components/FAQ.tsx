import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_DATA = [
  {
    question: "코딩을 전혀 모르는 초보자도 가입할 수 있나요?",
    answer: "네, 당연합니다! DEVSIGN은 실력보다 열정을 중요하게 생각합니다. 커리큘럼의 시작인 C언어 기초 교육부터 차근차근 함께하기 때문에 의지만 있다면 누구나 개발자로 성장할 수 있습니다."
  },
  {
    question: "주요 활동 시간과 장소는 어떻게 되나요?",
    answer: "학기중 주로 평일 방과 후 18시 30분에 IT융합대학 2층 대형 강의실에서 정기 총회가 진행됩니다. 개인 사정으로 참석이 불가할 땐, 자료 제출로 대체 가능합니다."
  },
  {
    question: "노트북이 반드시 필요한가요?",
    answer: "개인 학습과 프로젝트 진행을 위해 노트북 지참을 권장합니다. 하지만 없어도 무관합니다!"
  },
  {
    question: "정기 총회는 어떤 식으로 진행되나요?",
    answer: "매달 자신이 공부한 내용이나 진행 중인 프로젝트를 가볍게 공유하는 자리입니다. 거창한 결과물이 아니어도 괜찮습니다. 서로 피드백을 주고받으며 함께 성장하는 것이 목적입니다."
  },
  {
    question: "시험 기간에도 활동을 진행하나요?",
    answer: "부원들의 학업 성적도 중요하기 때문에, 시험 기간 2주 전부터는 모든 공식 활동을 중단하고 시험 공부에 집중할 수 있는 환경을 권장하고 있습니다."
  }
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="pt-8 pb-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        
        {/* 헤더 영역 */}
        <div className="text-center mb-8 md:mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs md:text-sm mb-3 md:mb-4"
          >
            <HelpCircle className="w-4 h-4 md:w-4 md:h-4" /> FAQ
          </motion.div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">자주 묻는 질문</h2>
        </div>

        {/* 아코디언 리스트 */}
        <div className="space-y-3 md:space-y-4">
          {FAQ_DATA.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100/30"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 md:p-8 text-left bg-white transition-colors gap-2"
              >
                <span className={`flex-1 text-[13px] md:text-lg font-bold transition-colors truncate pr-2 md:pr-4 ${openIndex === index ? "text-indigo-600" : "text-slate-700"}`}>
                  {item.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  className={`shrink-0 ${openIndex === index ? "text-indigo-600" : "text-slate-400"}`}
                >
                  <ChevronDown className="w-5 h-5 md:w-6 md:h-6" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 md:px-8 md:pb-8 text-[12px] md:text-base text-slate-500 font-medium leading-relaxed border-t border-slate-50 pt-3 md:pt-4">
                      {item.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};