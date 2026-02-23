package kr.co.devsign.devsign_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DiscordBotClient {

    private final RestTemplate restTemplate;

    // 필요하면 application.yml로 빼서 @Value로 주입 추천
    private static final String BOT_BASE = "http://127.0.0.1:8000";

    public Map<String, Object> getAvatar(String discordTag) {
        String url = BOT_BASE + "/get-avatar/" + discordTag;
        return restTemplate.getForObject(url, Map.class);
    }

    public Map<String, Object> checkMember(String discordTag) {
        String url = BOT_BASE + "/check-member/" + discordTag;
        return restTemplate.getForObject(url, Map.class);
    }

    public Map<String, Object> sendCode(String discordTag, String code) {
        String url = BOT_BASE + "/send-code";
        Map<String, String> body = new HashMap<>();
        body.put("discordTag", discordTag);
        body.put("code", code);
        return restTemplate.postForObject(url, body, Map.class);
    }

    public Map<String, Object> syncAllMembers() {
        String url = BOT_BASE + "/sync-all-members";
        return restTemplate.getForObject(url, Map.class);
    }
}

