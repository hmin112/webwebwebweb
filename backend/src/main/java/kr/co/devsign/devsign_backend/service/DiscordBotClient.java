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
}
