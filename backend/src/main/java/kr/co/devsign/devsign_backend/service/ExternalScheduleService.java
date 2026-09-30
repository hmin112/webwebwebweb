package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.schedule.ExternalScheduleResponse;
import kr.co.devsign.devsign_backend.entity.ExternalSchedule;
import kr.co.devsign.devsign_backend.repository.ExternalScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// ✨ [2026-09-30 신규] 조선대 학사일정 수집 + 바깥 일정(학사일정·SW 지원 프로그램) 저장/조회.
// 학사일정 페이지(www3.chosun.ac.kr/schdulmanage)는 달력 표로만 보여줘서, 달마다 읽은 뒤 일정 번호(set_layer)로
// 묶어 시작일~종료일을 만든다. 하루 한 번(새벽) + 서버가 켜질 때 지난 3개월 ~ 앞으로 9개월을 다시 읽는다.
@Service
@RequiredArgsConstructor
public class ExternalScheduleService {

    public static final String SOURCE_ACADEMIC = "CHOSUN_ACADEMIC";
    public static final String SOURCE_SW_PROGRAM = "SW_PROGRAM";

    private static final String ACADEMIC_URL = "https://www3.chosun.ac.kr/schdulmanage/chosun/1/view.do?layout=unknown";
    private static final String ACADEMIC_PAGE = "https://www3.chosun.ac.kr/chosun/224/subview.do";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    private static final Pattern LAYER_ID = Pattern.compile("set_layer\\('(\\d+)'");

    private final ExternalScheduleRepository repository;

    public List<ExternalScheduleResponse> list() {
        return repository.findAllByOrderByStartDateAsc().stream().map(ExternalScheduleResponse::from).toList();
    }

    // 같은 (원본, 번호)면 내용만 갱신하고, 처음 보면 새로 저장
    @Transactional
    public void upsert(String source, String externalId, String title, String category,
                       LocalDate start, LocalDate end, String url) {
        if (externalId == null || title == null || title.isBlank() || start == null) return;
        ExternalSchedule e = repository.findBySourceAndExternalId(source, externalId).orElseGet(ExternalSchedule::new);
        e.setSource(source);
        e.setExternalId(externalId);
        e.setTitle(title.trim());
        e.setCategory(category);
        e.setStartDate(start);
        e.setEndDate(end == null || end.isBefore(start) ? start : end);
        e.setUrl(url);
        e.setUpdatedAt(LocalDateTime.now());
        repository.save(e);
    }

    // 서버가 켜지고 1분 뒤 한 번, 그 뒤 매일 새벽 4시 10분
    @Scheduled(initialDelay = 60_000, fixedDelay = Long.MAX_VALUE)
    public void refreshOnStartup() {
        refreshAcademic();
    }

    @Scheduled(cron = "0 10 4 * * *", zone = "Asia/Seoul")
    public void refreshDaily() {
        refreshAcademic();
    }

    public void refreshAcademic() {
        YearMonth now = YearMonth.now(ZoneId.of("Asia/Seoul"));
        // 일정 번호 → [제목, 날짜들]
        Map<String, String> titles = new LinkedHashMap<>();
        Map<String, TreeSet<LocalDate>> days = new HashMap<>();
        for (int offset = -3; offset <= 9; offset++) {
            YearMonth ym = now.plusMonths(offset);
            try {
                Document doc = Jsoup.connect(ACADEMIC_URL)
                        .userAgent(USER_AGENT)
                        .timeout(10_000)
                        .data("year", String.valueOf(ym.getYear()))
                        .data("month", String.valueOf(ym.getMonthValue()))
                        .post();
                for (Element td : doc.select("table.table-type td")) {
                    Element dayEl = td.selectFirst("p.day");
                    if (dayEl == null) continue;
                    String dayText = dayEl.ownText().trim();
                    if (!dayText.matches("\\d{1,2}")) continue;
                    int day = Integer.parseInt(dayText);
                    if (day < 1 || day > ym.lengthOfMonth()) continue;
                    LocalDate date = ym.atDay(day);
                    for (Element a : td.select("a.onDate")) {
                        Matcher m = LAYER_ID.matcher(a.attr("onclick"));
                        if (!m.find()) continue;
                        String id = m.group(1);
                        titles.putIfAbsent(id, a.text().trim());
                        days.computeIfAbsent(id, k -> new TreeSet<>()).add(date);
                    }
                }
                Thread.sleep(300); // 원본 서버에 부담 주지 않게 천천히
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                System.err.println("조선대 학사일정 수집 실패(" + ym + "): " + e.getMessage());
            }
        }
        titles.forEach((id, title) -> {
            TreeSet<LocalDate> ds = days.get(id);
            if (ds == null || ds.isEmpty()) return;
            upsert(SOURCE_ACADEMIC, id, title, "학사", ds.first(), ds.last(), ACADEMIC_PAGE);
        });
    }
}
