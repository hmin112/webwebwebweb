package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.schedule.ScheduleRequest;
import kr.co.devsign.devsign_backend.dto.schedule.ScheduleResponse;
import kr.co.devsign.devsign_backend.entity.ClubSchedule;
import kr.co.devsign.devsign_backend.repository.ClubScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

// ✨ [2026-09-30 신규] 캘린더 일정 — 관리자가 캘린더에 직접 넣는 일정. 비로그인에게는 공개 일정만 보인다.
@Service
@RequiredArgsConstructor
public class ClubScheduleService {

    private static final Set<String> CATEGORIES = Set.of("학술", "친목", "대회", "기타");

    private final ClubScheduleRepository scheduleRepository;

    public List<ScheduleResponse> list(boolean loggedIn) {
        return scheduleRepository.findAllByOrderByDateAsc().stream()
                .filter(s -> loggedIn || !s.isMembersOnly())
                .map(ScheduleResponse::from)
                .toList();
    }

    @Transactional
    public ScheduleResponse create(ScheduleRequest req, String loginId) {
        ClubSchedule s = new ClubSchedule();
        apply(s, req);
        s.setCreatedBy(loginId);
        return ScheduleResponse.from(scheduleRepository.save(s));
    }

    @Transactional
    public ScheduleResponse update(Long id, ScheduleRequest req) {
        ClubSchedule s = scheduleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("일정을 찾을 수 없어요."));
        apply(s, req);
        return ScheduleResponse.from(scheduleRepository.save(s));
    }

    @Transactional
    public void delete(Long id) {
        scheduleRepository.deleteById(id);
    }

    private void apply(ClubSchedule s, ScheduleRequest req) {
        if (req == null || !StringUtils.hasText(req.title())) {
            throw new IllegalArgumentException("일정 제목을 입력해주세요.");
        }
        if (!isValidDate(req.date())) {
            throw new IllegalArgumentException("날짜를 2026.04.27처럼 입력해주세요.");
        }
        String end = req.endDate() == null ? "" : req.endDate().trim();
        if (!end.isEmpty()) {
            if (!isValidDate(end)) {
                throw new IllegalArgumentException("종료일을 2026.04.29처럼 입력해주세요.");
            }
            if (end.compareTo(req.date().trim()) < 0) {
                throw new IllegalArgumentException("종료일이 시작일보다 빠를 수 없어요.");
            }
        }
        s.setTitle(req.title().trim());
        s.setDate(req.date().trim());
        s.setEndDate(end.isEmpty() || end.equals(req.date().trim()) ? null : end);
        s.setCategory(CATEGORIES.contains(req.category()) ? req.category() : "기타");
        s.setLocation(StringUtils.hasText(req.location()) ? req.location().trim() : null);
        s.setMemo(StringUtils.hasText(req.memo()) ? req.memo().trim() : null);
        s.setMembersOnly(req.membersOnly());
    }

    private static boolean isValidDate(String d) {
        if (d == null || !d.trim().matches("\\d{4}\\.\\d{2}\\.\\d{2}")) return false;
        try {
            LocalDate.parse(d.trim().replace('.', '-'));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }
}
