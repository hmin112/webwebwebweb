package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.activity.MemberActivityResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.entity.AttendanceRecord;
import kr.co.devsign.devsign_backend.entity.AttendanceSession;
import kr.co.devsign.devsign_backend.entity.AttendanceTarget;
import kr.co.devsign.devsign_backend.entity.FeeRecord;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.dto.assembly.RepresentativeProject;
import kr.co.devsign.devsign_backend.entity.TeamSubmission;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.repository.AttendanceRecordRepository;
import kr.co.devsign.devsign_backend.repository.AttendanceTargetRepository;
import kr.co.devsign.devsign_backend.repository.FeeRecordRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.TeamSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

// ✨ [2026-09-30 신규] 개인 활동 대시보드 / 관리자 활동 현황
// 한 학기(1학기 3~6월, 2학기 9~12월) 기준으로 출석률·총회 제출률·회비 납부를 모은다.
// 총회 제출은 마이페이지 "대표 프로젝트" 기준 — 대표가 팀 프로젝트면 그 팀의 공유 자료 제출로 센다.
// 관리자 표는 부원 수만큼 반복 조회하지 않도록 학기 데이터를 한 번에 읽어 메모리에서 나눈다.
@Service
@RequiredArgsConstructor
public class ActivityService {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final MemberRepository memberRepository;
    private final AttendanceTargetRepository attendanceTargetRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AssemblyReportRepository reportRepository;
    private final FeeRecordRepository feeRecordRepository;
    private final TeamSubmissionRepository teamSubmissionRepository;
    private final AssemblyService assemblyService;

    @Transactional(readOnly = true)
    public MemberActivityResponse getActivity(String loginId, int year, int semester) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("부원을 찾을 수 없어요."));
        return build(List.of(member), year, semester).get(0);
    }

    @Transactional(readOnly = true)
    public List<MemberActivityResponse> getAllActivity(int year, int semester) {
        List<Member> members = memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .filter(m -> !m.isDeparted())
                .toList();
        return build(members, year, semester);
    }

    private List<MemberActivityResponse> build(List<Member> members, int year, int semester) {
        LocalDate today = LocalDate.now(KST);
        int[] months = semester == 1 ? new int[]{3, 4, 5, 6} : new int[]{9, 10, 11, 12};
        Set<String> loginIds = members.stream().map(Member::getLoginId).collect(Collectors.toSet());

        // --- 출석: 이번 학기 기간에 열린 출석 세션 중 대상이었던 것 / 체크인한 것
        LocalDateTime termStart = (semester == 1 ? LocalDate.of(year, 2, 1) : LocalDate.of(year, 8, 1)).atStartOfDay();
        LocalDateTime termEnd = (semester == 1 ? LocalDate.of(year, 8, 1) : LocalDate.of(year + 1, 2, 1)).atStartOfDay();
        Map<String, List<AttendanceTarget>> targetsByMember = attendanceTargetRepository.findAll().stream()
                .filter(t -> loginIds.contains(t.getLoginId()) && inTerm(t.getSession(), termStart, termEnd))
                .collect(Collectors.groupingBy(AttendanceTarget::getLoginId));
        Set<String> checkedIn = attendanceRecordRepository.findAll().stream()
                .filter(r -> loginIds.contains(r.getLoginId()) && inTerm(r.getSession(), termStart, termEnd))
                .map(r -> r.getSession().getId() + ":" + r.getLoginId())
                .collect(Collectors.toSet());

        // --- 총회: 제출 기간이 끝난 달 중 제출한 달 (진행 중인 달은 이미 냈을 때만 셈 — 아직 낼 시간이 남은 달로 깎지 않는다)
        Map<Integer, SubmissionPeriodResponse> periodByMonth = assemblyService.getSubmissionPeriods(year).stream()
                .collect(Collectors.toMap(SubmissionPeriodResponse::month, p -> p, (a, b) -> a));
        Map<String, List<AssemblyReport>> reportsByMember = reportRepository.findByYearAndSemester(year, semester).stream()
                .filter(r -> loginIds.contains(r.getLoginId()))
                .collect(Collectors.groupingBy(AssemblyReport::getLoginId));

        // --- 회비: 이미 시작된 달 중 명단에 있는 달 / 낸 달
        Map<Integer, Map<String, FeeRecord>> feeByMonth = new HashMap<>();
        for (int m : months) {
            feeByMonth.put(m, feeRecordRepository.findByYearAndMonthOrderByIdAsc(year, m).stream()
                    .collect(Collectors.toMap(FeeRecord::getLoginId, f -> f, (a, b) -> a)));
        }

        // 대표가 팀인 부원이 같은 팀이면 팀 자료를 한 번만 읽는다
        Map<Long, Map<Integer, TeamSubmission>> teamSubsCache = new HashMap<>();

        List<MemberActivityResponse> result = new ArrayList<>();
        for (Member m : members) {
            String id = m.getLoginId();

            List<AttendanceTarget> targets = targetsByMember.getOrDefault(id, List.of()).stream()
                    .sorted(Comparator.comparing((AttendanceTarget t) -> t.getSession().getStartedAt(),
                            Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                    .toList();
            List<MemberActivityResponse.Session> sessions = targets.stream()
                    .map(t -> new MemberActivityResponse.Session(
                            t.getSession().getTitle(),
                            t.getSession().getStartedAt() == null ? "" : t.getSession().getStartedAt().format(DATE),
                            checkedIn.contains(t.getSession().getId() + ":" + id)))
                    .toList();
            int attended = (int) sessions.stream().filter(MemberActivityResponse.Session::attended).count();
            var attendance = new MemberActivityResponse.Attendance(
                    sessions.size(), attended, rate(attended, sessions.size()), sessions.stream().limit(8).toList());

            // 대표 프로젝트(직접 고른 것, 없으면 팀 → 자료 올린 개인 순 자동) 기준으로 달별 제출 상태를 정한다
            RepresentativeProject rep = assemblyService.getMyProjects(id, year, semester).representative();
            Long repTeamId = null;
            if (rep != null && "TEAM".equals(rep.type())) {
                try { repTeamId = Long.parseLong(rep.key().substring("TEAM:".length())); } catch (RuntimeException ignored) { }
            }
            Map<Integer, String> statusByMonth = new HashMap<>();
            if (repTeamId != null) {
                Long tid = repTeamId;
                teamSubsCache.computeIfAbsent(tid, k -> teamSubmissionRepository
                        .findByTeam_IdAndYearAndSemesterOrderByMonthAsc(k, year, semester).stream()
                        .collect(Collectors.toMap(TeamSubmission::getMonth, t -> t, (a, b) -> a)))
                        .forEach((mo, t) -> statusByMonth.put(mo, t.getStatus()));
            } else {
                reportsByMember.getOrDefault(id, List.of())
                        .forEach(r -> statusByMonth.putIfAbsent(r.getMonth(), r.getStatus()));
            }
            List<MemberActivityResponse.Month> monthItems = new ArrayList<>();
            int due = 0, submitted = 0;
            for (int mo : months) {
                SubmissionPeriodResponse p = periodByMonth.get(mo);
                boolean started = p != null && !today.isBefore(LocalDate.parse(p.startDate()));
                boolean closed = p != null && today.isAfter(LocalDate.parse(p.endDate()));
                String status = statusByMonth.get(mo) == null ? "NOT_SUBMITTED" : statusByMonth.get(mo);
                boolean done = "SUBMITTED".equals(status);
                boolean counted = closed || (started && done);
                if (counted) {
                    due++;
                    if (done) submitted++;
                }
                monthItems.add(new MemberActivityResponse.Month(mo, status, counted, started && !closed));
            }
            var assembly = new MemberActivityResponse.Assembly(due, submitted, rate(submitted, due), monthItems,
                    repTeamId != null ? "TEAM" : "PERSONAL",
                    rep != null ? rep.title() : null,
                    repTeamId != null ? rep.teamName() : null);

            List<MemberActivityResponse.FeeMonth> feeMonths = new ArrayList<>();
            int feeDue = 0, feePaid = 0;
            for (int mo : months) {
                FeeRecord f = feeByMonth.get(mo).get(id);
                boolean isDue = !LocalDate.of(year, mo, 1).isAfter(today);
                boolean target = f != null;
                boolean paid = f != null && f.isPaid();
                if (isDue && target) {
                    feeDue++;
                    if (paid) feePaid++;
                }
                feeMonths.add(new MemberActivityResponse.FeeMonth(mo, target, paid, isDue));
            }
            var fee = new MemberActivityResponse.Fee(feeDue, feePaid, rate(feePaid, feeDue), feeMonths);

            List<Integer> rates = new ArrayList<>();
            if (attendance.rate() != null) rates.add(attendance.rate());
            if (assembly.rate() != null) rates.add(assembly.rate());
            if (fee.rate() != null) rates.add(fee.rate());
            Integer score = rates.isEmpty() ? null
                    : (int) Math.round(rates.stream().mapToInt(Integer::intValue).average().orElse(0));

            result.add(new MemberActivityResponse(
                    id, m.getName(), m.getStudentId(), m.getUserStatus(), m.getRole(), m.getProfileImage(),
                    year, semester, attendance, assembly, fee, score));
        }
        return result;
    }

    private static boolean inTerm(AttendanceSession s, LocalDateTime start, LocalDateTime end) {
        return s != null && s.getStartedAt() != null && !s.getStartedAt().isBefore(start) && s.getStartedAt().isBefore(end);
    }

    private static Integer rate(int done, int total) {
        return total == 0 ? null : (int) Math.round(done * 100.0 / total);
    }

}
