import type { ReactNode } from "react";
import { motion } from "framer-motion";

// ✨ [2026-09-30] 개인 활동 — 프로필(본인)과 관리자 활동 현황이 같은 데이터(/api/activity)를 쓴다.
// 총회 제출은 마이페이지 "대표 프로젝트" 기준(대표가 팀이면 팀 공유 자료 제출).

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
  assembly: {
    due: number;
    submitted: number;
    rate: number | null;
    months: { month: number; status: string; due: boolean; open: boolean }[];
    basis: "PERSONAL" | "TEAM";
    projectTitle?: string | null;
    teamName?: string | null;
  };
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

type DotState = "done" | "missed" | "pending" | "none";

// 달별 작은 막대 — 완료(초록), 마감 후 미완료(빨강), 진행 중·대상 아님(회색)
const MonthBars = ({ items }: { items: { month: number; state: DotState }[] }) => (
  <div className="flex items-end justify-center gap-1 mt-2.5">
    {items.map((it) => (
      <div key={it.month} className="flex flex-col items-center gap-0.5" title={`${it.month}월`}>
        <span
          className={`w-4 h-1.5 rounded-full ${
            it.state === "done" ? "bg-[#34C759]" : it.state === "missed" ? "bg-[#FF3B30]/70" : "bg-black/[0.08]"
          }`}
        />
        <span className={`text-[9px] font-semibold ${it.state === "none" ? "text-[#D1D1D6]" : "text-[#AEAEB2]"}`}>{it.month}</span>
      </div>
    ))}
  </div>
);

const Stat = ({ label, color, rate, fraction, caption, children }: {
  label: string; color: string; rate: number | null; fraction: string; caption?: string; children?: ReactNode;
}) => (
  <div className="flex flex-col items-center text-center min-w-0">
    <Ring value={rate} color={color} size={76} stroke={7}>
      <span className="text-[17px] font-bold text-[#1D1D1F] tracking-[-0.03em]">{rate == null ? "–" : `${rate}%`}</span>
    </Ring>
    <p className="text-[13px] font-semibold text-[#1D1D1F] mt-2.5">{label}</p>
    <p className="text-xs text-[#8E8E93] mt-0.5">{fraction}</p>
    {caption && <p className="text-[11px] text-[#AEAEB2] mt-0.5 max-w-[9.5rem] truncate" title={caption}>{caption}</p>}
    {children}
  </div>
);

// ✨ 프로필 카드 오른쪽 — 출석 · 총회 제출 · 회비를 원형 표시 세 개로
export const ActivityStats = ({ data }: { data: MemberActivity }) => {
  const { attendance, assembly, fee } = data;
  const assemblyCaption =
    assembly.basis === "TEAM"
      ? `대표: 팀 ${assembly.teamName || ""}`.trim()
      : assembly.projectTitle
        ? `대표: ${assembly.projectTitle}`
        : "개인 제출 기준";
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-5">
      <Stat
        label="출석"
        color="#0A84FF"
        rate={attendance.rate}
        fraction={attendance.total === 0 ? "출석 체크 없음" : `${attendance.attended} / ${attendance.total}회`}
      >
        {attendance.sessions.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-2.5">
            {attendance.sessions.slice(0, 6).reverse().map((s, i) => (
              <span
                key={i}
                title={`${s.date} ${s.title} · ${s.attended ? "출석" : "결석"}`}
                className={`w-2 h-2 rounded-full ${s.attended ? "bg-[#34C759]" : "bg-[#FF3B30]/70"}`}
              />
            ))}
          </div>
        )}
      </Stat>
      <Stat
        label="총회 제출"
        color="#5E5CE6"
        rate={assembly.rate}
        fraction={assembly.due === 0 ? "마감된 달 없음" : `${assembly.submitted} / ${assembly.due}개월`}
        caption={assemblyCaption}
      >
        <MonthBars
          items={assembly.months.map((m) => ({
            month: m.month,
            state: m.status === "SUBMITTED" ? "done" : m.due ? "missed" : m.open ? "pending" : "none",
          }))}
        />
      </Stat>
      <Stat
        label="회비"
        color="#30B0C7"
        rate={fee.rate}
        fraction={fee.due === 0 ? "납부할 회비 없음" : fee.paid === fee.due ? "모두 냈어요" : `${fee.due - fee.paid}개월 미납`}
      >
        <MonthBars
          items={fee.months.map((m) => ({
            month: m.month,
            state: !m.target ? "none" : m.paid ? "done" : m.due ? "missed" : "pending",
          }))}
        />
      </Stat>
    </div>
  );
};
