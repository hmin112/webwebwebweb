import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Code2, FileText, Wallet } from "lucide-react";

// ✨ [2026-09-30] 개인 활동 대시보드 — 프로필(본인)과 관리자 활동 현황이 같은 데이터(/api/activity)를 쓴다.

export type MemberActivity = {
  loginId: string;
  name: string;
  studentId: string;
  userStatus: string;
  role: string;
  profileImage?: string | null;
  year: number;
  semester: number;
  attendance: { total: number; attended: number; rate: number | null; sessions: { title: string; date: string; attended: boolean }[] };
  assembly: { due: number; submitted: number; rate: number | null; months: { month: number; status: string; due: boolean; open: boolean }[] };
  oj: { linked: boolean; solved: number; submissions: number; rank: number | null; rankOf: number };
  fee: { due: number; paid: number; rate: number | null; months: { month: number; target: boolean; paid: boolean; due: boolean }[] };
  score: number | null;
};

// 점수 색 — 80 이상 초록, 50 이상 주황, 그 아래 빨강 (애플 시스템 색)
export const scoreColor = (v: number | null | undefined) =>
  v == null ? "#AEAEB2" : v >= 80 ? "#34C759" : v >= 50 ? "#FF9F0A" : "#FF3B30";

// 원형 진행 표시 — 값이 없으면 회색 빈 원
export const Ring = ({ value, color, size = 64, stroke = 7, children }: { value: number | null; color: string; size?: number; stroke?: number; children?: ReactNode }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(0 0 0 / 0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

const Tile = ({ icon, color, label, children }: { icon: ReactNode; color: string; label: string; children: ReactNode }) => (
  <div className="glass-card rounded-[26px] p-5 flex flex-col min-h-[196px]">
    <div className="flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-[9px] flex items-center justify-center text-white" style={{ backgroundColor: color }}>
        {icon}
      </span>
      <span className="text-[13px] font-semibold text-[#1D1D1F]">{label}</span>
    </div>
    {children}
  </div>
);

const Pct = ({ value }: { value: number | null }) => (
  <span className="text-[15px] font-bold text-[#1D1D1F] tracking-[-0.02em]">{value == null ? "–" : `${value}%`}</span>
);

// 달별 작은 칸 — 완료(색), 미완료(빨간 테두리), 아직 아님(회색)
const MonthDots = ({ items }: { items: { month: number; state: "done" | "missed" | "pending" | "none" }[] }) => (
  <div className="grid grid-cols-4 gap-1.5 mt-auto pt-4">
    {items.map((it) => (
      <div key={it.month} className="flex flex-col items-center gap-1">
        <span
          className={`w-full h-1.5 rounded-full ${
            it.state === "done" ? "bg-[#34C759]" : it.state === "missed" ? "bg-[#FF3B30]/70" : "bg-black/[0.08]"
          }`}
        />
        <span className={`text-[10px] font-semibold ${it.state === "none" ? "text-[#D1D1D6]" : "text-[#8E8E93]"}`}>{it.month}월</span>
      </div>
    ))}
  </div>
);

export const ActivityGrid = ({ data }: { data: MemberActivity }) => {
  const { attendance, assembly, oj, fee } = data;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <Tile icon={<CalendarCheck size={15} strokeWidth={2.4} />} color="#0A84FF" label="출석">
        <div className="flex items-center gap-4">
          <Ring value={attendance.rate} color="#0A84FF"><Pct value={attendance.rate} /></Ring>
          <div className="min-w-0">
            <p className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.02em] leading-none">
              {attendance.attended}<span className="text-[#AEAEB2] text-base font-semibold"> / {attendance.total}회</span>
            </p>
            <p className="text-xs text-[#8E8E93] mt-1.5">{attendance.total === 0 ? "이번 학기 출석 체크가 아직 없어요" : "출석 체크 참여"}</p>
          </div>
        </div>
        {attendance.sessions.length > 0 && (
          <div className="mt-auto pt-4 space-y-1.5">
            {attendance.sessions.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#6E6E73] truncate">{s.date} {s.title}</span>
                <span className={`shrink-0 font-semibold ${s.attended ? "text-[#34C759]" : "text-[#FF3B30]"}`}>{s.attended ? "출석" : "결석"}</span>
              </div>
            ))}
          </div>
        )}
      </Tile>

      <Tile icon={<FileText size={15} strokeWidth={2.4} />} color="#5E5CE6" label="총회 제출">
        <div className="flex items-center gap-4">
          <Ring value={assembly.rate} color="#5E5CE6"><Pct value={assembly.rate} /></Ring>
          <div className="min-w-0">
            <p className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.02em] leading-none">
              {assembly.submitted}<span className="text-[#AEAEB2] text-base font-semibold"> / {assembly.due}개월</span>
            </p>
            <p className="text-xs text-[#8E8E93] mt-1.5">
              {assembly.due === 0 ? "아직 마감된 달이 없어요" : "마감된 달 기준"}
              {assembly.months.some((m) => m.open && m.status !== "SUBMITTED") && " · 지금 제출 기간이에요"}
            </p>
          </div>
        </div>
        <MonthDots
          items={assembly.months.map((m) => ({
            month: m.month,
            state: m.status === "SUBMITTED" ? "done" : m.due ? "missed" : m.open ? "pending" : "none",
          }))}
        />
      </Tile>

      <Tile icon={<Code2 size={15} strokeWidth={2.4} />} color="#FF9F0A" label="OJ">
        {oj.linked ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[44px] font-bold text-[#1D1D1F] tracking-[-0.04em] leading-none">{oj.solved}</span>
              <span className="text-sm font-semibold text-[#8E8E93]">문제 맞힘</span>
            </div>
            <p className="text-xs text-[#8E8E93] mt-2">제출 {oj.submissions}회</p>
            {oj.rank != null && (
              <div className="mt-auto pt-4">
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-[#FF9F0A]/[0.12] text-[#C93400] text-xs font-semibold">
                  부원 {oj.rankOf}명 중 {oj.rank}위
                </span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#8E8E93] leading-relaxed">아직 OJ를 열어본 적이 없어요. 상단 메뉴의 OJ에 들어가면 자동으로 연결돼요.</p>
        )}
      </Tile>

      <Tile icon={<Wallet size={15} strokeWidth={2.4} />} color="#30B0C7" label="회비">
        <div className="flex items-center gap-4">
          <Ring value={fee.rate} color="#30B0C7"><Pct value={fee.rate} /></Ring>
          <div className="min-w-0">
            <p className="text-[22px] font-bold text-[#1D1D1F] tracking-[-0.02em] leading-none">
              {fee.paid}<span className="text-[#AEAEB2] text-base font-semibold"> / {fee.due}개월</span>
            </p>
            <p className="text-xs text-[#8E8E93] mt-1.5">
              {fee.due === 0 ? "납부할 회비가 아직 없어요" : fee.paid === fee.due ? "모두 냈어요" : `${fee.due - fee.paid}개월 미납`}
            </p>
          </div>
        </div>
        <MonthDots
          items={fee.months.map((m) => ({
            month: m.month,
            state: !m.target ? "none" : m.paid ? "done" : m.due ? "missed" : "pending",
          }))}
        />
      </Tile>
    </div>
  );
};
