package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.PrintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

// ✨ [2026-10-01 신규] 웹 인쇄 — 로그인한 부원 (업로드·미리보기·인쇄 요청·취소·내 기록·프린터 상태)
@RestController
@RequestMapping("/api/print")
@RequiredArgsConstructor
public class PrintController {

    private final PrintService printService;

    private static boolean isAdmin(Authentication a) {
        return a != null && a.getAuthorities().stream().anyMatch(g -> "ROLE_ADMIN".equals(g.getAuthority()));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(Authentication auth, @RequestParam MultipartFile file) {
        try {
            return ResponseEntity.ok(printService.upload(auth.getName(), file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(StatusResponse.fail("파일을 올리지 못했어요."));
        }
    }

    @GetMapping("/jobs/{id}/preview")
    public ResponseEntity<?> preview(Authentication auth, @PathVariable Long id) {
        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CACHE_CONTROL, "no-store")
                    .body(printService.preview(id, auth.getName(), isAdmin(auth)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/jobs/{id}/submit")
    public ResponseEntity<?> submit(Authentication auth, @PathVariable Long id, @RequestBody Map<String, Integer> body) {
        try {
            return ResponseEntity.ok(printService.submit(id, auth.getName(), body.getOrDefault("copies", 1)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/jobs/{id}/cancel")
    public ResponseEntity<?> cancel(Authentication auth, @PathVariable Long id) {
        try {
            return ResponseEntity.ok(printService.cancel(id, auth.getName(), isAdmin(auth)));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @GetMapping("/jobs/mine")
    public Object mine(Authentication auth) {
        return printService.mine(auth.getName());
    }

    @GetMapping("/status")
    public Object status() {
        return printService.status();
    }
}
