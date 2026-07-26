package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.GuildIconResponse;
import kr.co.devsign.devsign_backend.service.DiscordBotClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// ✨ 웹사이트 로고 등에 쓰이는 동아리 디스코드 서버 아이콘을 실시간으로 조회하는 공개 API.
// 서버 아이콘 URL을 프론트에 하드코딩하면 아이콘이 바뀔 때마다 깨지므로, 항상 최신 값을 받아온다.
@RestController
@RequestMapping("/api/guild")
@RequiredArgsConstructor
public class GuildController {

    private final DiscordBotClient discordBotClient;

    @GetMapping("/icon")
    public GuildIconResponse getGuildIcon() {
        try {
            Map<String, Object> res = discordBotClient.getGuildIcon();
            if (res == null) {
                return new GuildIconResponse("error", null);
            }
            String status = String.valueOf(res.get("status"));
            String iconUrl = res.get("iconUrl") != null ? String.valueOf(res.get("iconUrl")) : null;
            return new GuildIconResponse(status, iconUrl);
        } catch (Exception e) {
            return new GuildIconResponse("error", null);
        }
    }
}
