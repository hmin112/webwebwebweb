package kr.co.devsign.devsign_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DiscordBotClient {

    private final RestTemplate restTemplate;

    // application.properties에 설정된 주소(http://discord-bot:8000)를 주입받아 사용합니다.
    @Value("${discord.bot.url}")
    private String botBaseUrl;

    public Map<String, Object> getAvatar(String discordTag) {
        String url = botBaseUrl + "/get-avatar/" + discordTag;
        return restTemplate.getForObject(url, Map.class);
    }

    public Map<String, Object> checkMember(String discordTag) {
        String url = botBaseUrl + "/check-member/" + discordTag;
        return restTemplate.getForObject(url, Map.class);
    }

    public Map<String, Object> sendCode(String discordTag, String code) {
        String url = botBaseUrl + "/send-code";
        Map<String, String> body = new HashMap<>();
        body.put("discordTag", discordTag);
        body.put("code", code);
        return restTemplate.postForObject(url, body, Map.class);
    }

    public Map<String, Object> syncAllMembers() {
        String url = botBaseUrl + "/sync-all-members";
        return restTemplate.getForObject(url, Map.class);
    }

    // ✨ [신규] 여러 명에게 동일 메시지를 DM으로 일괄 발송 (예: 총회자료 미제출자 리마인드)
    public Map<String, Object> sendBulkMessage(List<String> discordTags, String message) {
        String url = botBaseUrl + "/send-bulk-message";
        Map<String, Object> body = new HashMap<>();
        body.put("discordTags", discordTags);
        body.put("message", message);
        return restTemplate.postForObject(url, body, Map.class);
    }

    // ✨ [신규] 동아리 디스코드 서버 아이콘 URL 실시간 조회 (웹사이트 로고용)
    public Map<String, Object> getGuildIcon() {
        String url = botBaseUrl + "/guild-icon";
        return restTemplate.getForObject(url, Map.class);
    }

    // ✨ [신규] 총회 출석 — 특정 메시지에 지정한 이모지로 반응한 사람 목록 조회
    // ⚠️ emoji를 미리 URLEncoder로 인코딩한 뒤 RestTemplate에 완성된 문자열로 넘기면, RestTemplate이
    // URI 템플릿을 만들며 그 문자열을 다시 한 번 인코딩해(%가 %25로) 이중 인코딩이 발생한다.
    // 대신 {emoji}를 URI 템플릿 변수로 넘겨 RestTemplate이 원본 문자열을 "정확히 한 번만" 인코딩하게 한다.
    public Map<String, Object> getMessageReactors(String messageId, String emoji) {
        String url = botBaseUrl + "/message-reactors/{messageId}?emoji={emoji}";
        return restTemplate.getForObject(url, Map.class, messageId, emoji);
    }
}
