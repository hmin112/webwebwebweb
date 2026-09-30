package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.member.OfficerContactResponse;
import kr.co.devsign.devsign_backend.dto.officer.OfficerTermDto;
import kr.co.devsign.devsign_backend.entity.OfficerTerm;
import kr.co.devsign.devsign_backend.repository.OfficerTermRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.Year;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

// ✨ [2026-09-30 신규] 역대 임원진 — 조회(누구나), 관리자 연도별 입력, 올해 임원진 자동 기록
@Service
@RequiredArgsConstructor
public class OfficerHistoryService {

    public static final List<String> ROLES = List.of("회장", "부회장", "총무");

    private final OfficerTermRepository repository;
    private final MemberService memberService;

    public List<OfficerTermDto> list() {
        return repository.findAllByOrderByYearDesc().stream()
                .sorted(Comparator.comparingInt(OfficerTerm::getYear).reversed()
                        .thenComparingInt(t -> ROLES.indexOf(t.getRole())))
                .map(t -> new OfficerTermDto(t.getYear(), t.getRole(), t.getName(), t.getStudentId()))
                .toList();
    }

    // 관리자가 한 해의 임원진을 통째로 저장 — 이름이 빈 역할은 지운다. 직접 입력한 값은 자동 기록이 덮어쓰지 않는다.
    @Transactional
    public List<OfficerTermDto> saveYear(int year, List<OfficerTermDto> officers) {
        if (year < 2010 || year > Year.now(ZoneId.of("Asia/Seoul")).getValue() + 1) {
            throw new IllegalArgumentException("연도를 확인해주세요.");
        }
        for (String role : ROLES) {
            OfficerTermDto in = officers == null ? null : officers.stream()
                    .filter(o -> o != null && role.equals(o.role())).findFirst().orElse(null);
            var existing = repository.findByYearAndRole(year, role);
            if (in == null || !StringUtils.hasText(in.name())) {
                existing.ifPresent(repository::delete);
                continue;
            }
            OfficerTerm t = existing.orElseGet(OfficerTerm::new);
            t.setYear(year);
            t.setRole(role);
            t.setName(in.name().trim());
            t.setStudentId(StringUtils.hasText(in.studentId()) ? in.studentId().trim() : null);
            t.setManual(true);
            t.setUpdatedAt(LocalDateTime.now());
            repository.save(t);
        }
        return list();
    }

    // 서버가 켜지고 1분 뒤 + 매일 새벽 4시 20분 — 지금 부원 이름의 "(회장)" 등으로 올해 임원진을 기록
    @Scheduled(initialDelay = 70_000, fixedDelay = Long.MAX_VALUE)
    public void recordOnStartup() {
        recordCurrentYear();
    }

    @Scheduled(cron = "0 20 4 * * *", zone = "Asia/Seoul")
    public void recordDaily() {
        recordCurrentYear();
    }

    @Transactional
    public void recordCurrentYear() {
        int year = Year.now(ZoneId.of("Asia/Seoul")).getValue();
        for (OfficerContactResponse o : memberService.getOfficerContacts()) {
            var existing = repository.findByYearAndRole(year, o.role());
            if (existing.isPresent() && existing.get().isManual()) continue; // 관리자가 직접 고친 건 그대로
            OfficerTerm t = existing.orElseGet(OfficerTerm::new);
            t.setYear(year);
            t.setRole(o.role());
            t.setName(o.name());
            t.setStudentId(o.studentId());
            t.setManual(false);
            t.setUpdatedAt(LocalDateTime.now());
            repository.save(t);
        }
    }
}
