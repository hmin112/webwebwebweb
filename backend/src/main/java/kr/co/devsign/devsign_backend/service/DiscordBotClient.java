package kr.co.devsign.devsign_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
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
}