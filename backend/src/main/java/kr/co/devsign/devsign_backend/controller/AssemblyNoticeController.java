package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.AssemblyNoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// ✨ [2026-10-01 신규] 관리자 — 그 달 총회 공지 반응 현황 (ADMIN만: /api/admin/**)
@RestController
@RequiredArgsConstructor
public class AssemblyNoticeController {

    private final AssemblyNoticeService assemblyNoticeService;

    @GetMapping("/api/admin/assembly-notice")
    public ResponseEntity<?> reactions(@RequestParam int year, @RequestParam int month) {
        try {
            return ResponseEntity.ok(assemblyNoticeService.reactions(year, month));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(StatusResponse.fail(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(StatusResponse.fail("디스코드 봇과 통신할 수 없어요: " + e.getMessage()));
        }
    }
}
