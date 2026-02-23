import { motion } from "framer-motion";
import { 
  Lock, Wind, Power, Circle, Cpu 
} from "lucide-react";

export const About = () => {
  return (
    <div className="bg-[#fdfeff]">
      {/* 1. 기존 동아리 소개 섹션 */}
      <section id="about" className="py-24 overflow-hidden border-b border-slate-50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            {/* 왼쪽: 이미지 영역 */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-[60%] relative"
            >
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100/50 border border-slate-100">
                <img 
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2000" 
                  alt="Coding Community" 
                  className="w-full h-[500px] object-cover transform hover:scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/20 to-transparent" />
              </div>
              <div className="absolute -z-10 -top-10 -left-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60" />
            </motion.div>

            {/* 오른쪽: 텍스트 영역 */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-[40%]"
            >
              <span className="text-indigo-600 font-extrabold text-lg mb-4 block tracking-wider">
                동아리 소개
              </span>
              
              <h2 className="text-3xl md:text-4xl font-[900] text-slate-900 mb-8 leading-tight tracking-tight">
                개발자를 향해<br /> 
                <span className="text-indigo-600">모두 함께 성장하는</span><br />
                동아리입니다
              </h2>

              <div className="space-y-6 text-slate-600 text-[15px] md:text-[16px] leading-relaxed font-medium text-justify">
                <p>
                  2010년에 창단된 <span className="text-indigo-600 font-bold">DEVSIGN</span>은 조선대학교 IT융합대학을 대표하는 코딩 학술 동아리로, 지난 10여 년간 수많은 IT 인재를 배출하며 그 전통을 이어오고 있습니다. 저희는 프로그래밍의 근간이 되는 기술적 기초를 다지는 데 주력하며 학술적 역량을 쌓아가는 데 매진하고 있습니다.
                </p>
                <p>
                  단순한 학습에 그치지 않고, 매달 정기적인 프로젝트 발표회를 개최하여 개인의 성과를 공유합니다. 이러한 과정을 통해 부원들은 실전 감각을 갖춘 개발자로 거듭나고 있습니다.
                </p>
                <p>
                  현재 <span className="text-pink-500 font-bold">100여 명의 부원</span>이 활동 중인 DEVSIGN은 '함께하는 성장의 가치'를 최우선으로 합니다. 야유회와 회식 등 다채로운 친목 활동을 통해 긴밀한 유대감을 형성하고 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-12 pt-10 border-t border-slate-100">
                <div>
                  <div className="text-4xl font-black text-indigo-600 mb-1">100+</div>
                  <div className="text-slate-500 font-bold text-sm">활동 부원</div>
                </div>
                <div>
                  <div className="text-4xl font-black text-pink-500 mb-1">17th</div>
                  <div className="text-slate-500 font-bold text-sm">동아리 기수</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. 스마트 시스템 소개 섹션 */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm mb-6"
            >
              <Cpu size={16} /> IoT & Discord Infrastructure
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
              손끝에서 시작되는<br />스마트 워크스페이스
            </h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">
              DEVSIGN은 직접 구축한 디스코드 봇 시스템을 통해 실습실의 모든 환경을 관리합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
            
            {/* 💡 WINDEV: 냉난방 제어 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              className="bg-slate-50 rounded-[3rem] p-10 md:p-14 border border-slate-100 group transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden shadow-lg border-2 border-white relative group-hover:scale-110 transition-transform">
                    {/* ✅ 수정됨: scale-150, -translate-y-2 제거하여 딱 맞게 조정 */}
                    <img src="/images/windev_profile.jpeg" alt="WINDEV" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-slate-50 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      WINDEV <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-[10px] text-white uppercase tracking-widest">APP</span>
                    </h3>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Climate Control Bot</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 font-bold text-lg mb-10 leading-relaxed text-justify flex-1">
                언제 어디서나 디스코드로 동아리방 온도를 조절하세요. 외부에서도 냉난방기를 원격 제어하여 입실 전 최적의 환경을 조성할 수 있습니다.
              </p>

              <div className="bg-slate-900 rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-slate-800 flex flex-col justify-between min-h-[340px]">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
                  <span className="text-slate-400 text-xs font-black uppercase tracking-widest">[냉난방기 제어]</span>
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black tracking-widest animate-pulse">CONNECTED</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <p className="text-green-400 font-black text-[11px] mb-2 uppercase">Cooling</p>
                    <p className="text-white font-black text-xl tracking-tight">18°C ~ 27°C</p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                    <p className="text-red-400 font-black text-[11px] mb-2 uppercase">Heating</p>
                    <p className="text-white font-black text-xl tracking-tight">23°C ~ 30°C</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-[#22c55e] text-white px-5 py-3 rounded-xl text-[11px] font-black shadow-lg shadow-green-500/20 active:scale-95 transition-all cursor-default">에어컨 켜기</div>
                  <div className="bg-[#ef4444] text-white px-5 py-3 rounded-xl text-[11px] font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all cursor-default">히터 켜기</div>
                  <div className="bg-slate-700 text-white px-5 py-3 rounded-xl text-[11px] font-black hover:bg-slate-600 active:scale-95 transition-all flex items-center gap-2 cursor-default">
                    <Power size={14} /> 전원 끄기
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 💡 크산테: 도어락 제어 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10 }}
              className="bg-slate-50 rounded-[3rem] p-10 md:p-14 border border-slate-100 group transition-all flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden shadow-lg border-2 border-white relative group-hover:scale-110 transition-transform">
                    {/* ✅ 수정됨: scale-150, translate-y-8 제거하여 딱 맞게 조정 */}
                    <img src="/images/ksante_profile.jpeg" alt="크산테" className="w-full h-full object-cover" />
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-slate-50 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                      크산테 <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-[10px] text-white uppercase tracking-widest">APP</span>
                    </h3>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Access Control Bot</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 font-bold text-lg mb-10 leading-relaxed text-justify flex-1">
                24시간 여러분들의 자유로운 학습을 지원합니다. 물리적인 열쇠 필요없이 디스코드를 사용해 학번을 인증하고 도어락을 제어하여 동아리방에 자유롭게 출입 가능합니다.
              </p>

              <div className="space-y-4 bg-white/50 p-6 rounded-[2.5rem] border border-slate-200 shadow-inner min-h-[340px] flex flex-col">
                <div className="px-4 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Security Activity</div>
                <div className="flex-1 flex flex-col justify-around">
                  {[
                    { name: "김유찬", time: "오전 09:38", color: "indigo" },
                    { name: "최승원", time: "오후 12:44", color: "amber" },
                    { name: "김아현", time: "오후 01:08", color: "pink" }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group-hover:translate-x-1 transition-transform">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 bg-${log.color}-50 text-${log.color}-500 rounded-xl flex items-center justify-center text-xs font-black border border-${log.color}-100/50`}>
                          {log.name[0]}
                        </div>
                        <p className="text-sm font-bold text-slate-700">
                          <span className="text-indigo-600 font-black">{log.name}</span> 님이 동아리방 문을 열었습니다
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-slate-300">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </div>
  );
};