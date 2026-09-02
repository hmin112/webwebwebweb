package kr.co.devsign.devsign_backend.service;

import jakarta.annotation.PostConstruct;
import kr.co.devsign.devsign_backend.dto.chosun.ChosunProgramResponse;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

// 조선대학교 SW중심대학사업단 "지원프로그램" 페이지(정적 HTML, 별도 API 없음)를 주기적으로
// 스크래핑해서 홈 화면 미리보기용으로 캐싱한다. 매 요청마다 외부 사이트를 긁으면 느리고 상대
// 서버에도 부담이 되므로, 서버 기동 시 1회 + 이후 30분마다만 갱신하고 홈 화면 요청은 항상
// 캐시된 값을 즉시 받아간다. 홈 화면에는 "신청하기"(현재 신청 가능) 상태인 항목만 노출.
@Service
public class ChosunProgramService {

    private static final String SOURCE_URL = "https://sw.chosun.ac.kr/main/menu?gc=Program";
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    private final AtomicReference<List<ChosunProgramResponse>> cache = new AtomicReference<>(List.of());

    public List<ChosunProgramResponse> getPrograms() {
        return cache.get();
    }

    @PostConstruct
    public void init() {
        refresh();
    }

    // 30분마다 재수집 — 신청 가능 여부가 실시간에 가깝게 반영되면서도 원본 서버에 과도한 부담을 주지 않는 주기
    @Scheduled(fixedRate = 30 * 60 * 1000)
    public void refresh() {
        try {
            Document doc = Jsoup.connect(SOURCE_URL)
                    .userAgent(USER_AGENT)
                    .timeout(10_000)
                    .get();

            List<ChosunProgramResponse> parsed = new ArrayList<>();
            Elements items = doc.select("ul.class_list_wrap > li");
            for (Element item : items) {
                // "신청하기" 상태(state_acc)인 항목만 홈 화면에 노출 — 접수마감/종료는 제외
                if (item.selectFirst(".status .state_acc") == null) continue;

                Element link = item.selectFirst("a");
                Element img = item.selectFirst("figure img");
                Element titleEl = item.selectFirst(".info .tit");
                Element categoryEl = item.selectFirst(".info .cate");
                if (link == null || img == null || titleEl == null) continue;

                parsed.add(new ChosunProgramResponse(
                        titleEl.text().trim(),
                        categoryEl != null ? categoryEl.text().trim() : "",
                        img.attr("abs:src"),
                        link.attr("abs:href"),
                        extractByLabel(item, "신청기간"),
                        extractByLabel(item, "진행기간")
                ));
            }

            cache.set(parsed);
        } catch (Exception e) {
            // 스크래핑 실패해도 기존 캐시(마지막으로 성공한 결과)는 그대로 유지 — 홈 화면이 빈 화면이 되지 않게
            System.err.println("조선대 SW중심대학 지원프로그램 스크래핑 실패: " + e.getMessage());
        }
    }

    private String extractByLabel(Element item, String label) {
        for (Element li : item.select(".info ul li")) {
            Element strong = li.selectFirst("strong");
            if (strong != null && label.equals(strong.text().trim())) {
                return li.ownText().trim();
            }
        }
        return "";
    }
}
