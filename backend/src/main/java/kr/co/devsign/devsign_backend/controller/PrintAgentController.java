package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.PrintService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

// ✨ [2026-10-01 신규] 프린터 PC의 쿵프린타 봇 전용 — 로그인 대신 비밀 키(X-Print-Agent-Key)로 인증한다.
// 키는 서버의 /home/devsign/.env_devsign_print(PRINT_AGENT_KEY)와 프린터 PC의 .env에만 있다. 키가 비어 있으면 꺼진 상태.
@RestController
@RequestMapping("/api/print-agent")
@RequiredArgsConstructor
public class PrintAgentController {

    private final PrintService printService;

    @Value("${PRINT_AGENT_KEY:}")
    private String agentKey;

    private boolean authorized(String key) {
        if (agentKey == null || agentKey.isBlank() || key == null) return false;
        return MessageDigest.isEqual(agentKey.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/claim")
    public ResponseEntity<?> claim(@RequestHeader(value = "X-Print-Agent-Key", required = false) String key) {
        if (!authorized(key)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return printService.claim().<ResponseEntity<?>>map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/jobs/{id}/file")
    public ResponseEntity<?> file(@RequestHeader(value = "X-Print-Agent-Key", required = false) String key, @PathVariable Long id) {
        if (!authorized(key)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_OCTET_STREAM).body(printService.agentFile(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/jobs/{id}/result")
    public ResponseEntity<?> result(@RequestHeader(value = "X-Print-Agent-Key", required = false) String key,
                                    @PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (!authorized(key)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        boolean success = Boolean.TRUE.equals(body.get("success"));
        Object msg = body.get("message");
        printService.agentResult(id, success, msg == null ? null : msg.toString());
        return ResponseEntity.ok(StatusResponse.success());
    }
}
