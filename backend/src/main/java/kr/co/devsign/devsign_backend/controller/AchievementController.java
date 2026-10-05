package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.achievement.AchievementDtos.*;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.entity.AchievementFile;
import kr.co.devsign.devsign_backend.service.AchievementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.function.Supplier;

// ✨ [2026-10-05 신규] 관리자 "실적" 탭 — /api/admin/** 라서 관리자만. 압축·파일 내려받기는 한 번 쓰는 주소로 연다
// (브라우저가 바로 받아 저장하게 하려고 — 큰 압축 파일을 화면 메모리에 담지 않는다)
@RestController
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService service;

    private static ResponseEntity<?> handle(Supplier<Object> body) {
        try {
            return ResponseEntity.ok(body.get());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @GetMapping("/api/admin/achievements/years")
    public Object years() {
        return service.years();
    }

    @GetMapping("/api/admin/achievements")
    public ResponseEntity<?> list(@RequestParam int year, Authentication auth) {
        return handle(() -> service.list(year, auth.getName()));
    }

    @GetMapping("/api/admin/achievements/sessions")
    public Object sessions(@RequestParam int year) {
        return service.sessions(year);
    }

    @PostMapping("/api/admin/achievements")
    public ResponseEntity<?> create(@RequestBody SaveRequest req, Authentication auth) {
        return handle(() -> service.create(req, auth.getName()));
    }

    @PutMapping("/api/admin/achievements/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody SaveRequest req) {
        return handle(() -> service.update(id, req));
    }

    @DeleteMapping("/api/admin/achievements/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return handle(() -> {
            service.delete(id);
            return StatusResponse.success();
        });
    }

    @PostMapping("/api/admin/achievements/{id}/resync-hof")
    public ResponseEntity<?> resync(@PathVariable Long id) {
        return handle(() -> service.resyncHallOfFame(id));
    }

    @PostMapping("/api/admin/achievements/import-discord")
    public ResponseEntity<?> importDiscord(@RequestParam int year, Authentication auth) {
        try {
            return ResponseEntity.ok(service.importAssembliesFromDiscord(year, auth.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(StatusResponse.fail("디스코드에서 가져오지 못했어요. 봇이 켜져 있는지 확인해주세요."));
        }
    }

    @PostMapping("/api/admin/achievements/{id}/resync-discord")
    public ResponseEntity<?> resyncDiscord(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.resyncDiscord(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(StatusResponse.fail("디스코드에서 가져오지 못했어요."));
        }
    }

    @PutMapping("/api/admin/achievements/{id}/participants")
    public ResponseEntity<?> participants(@PathVariable Long id, @RequestBody ParticipantsRequest req) {
        return handle(() -> service.setParticipants(id, req));
    }

    @PostMapping("/api/admin/achievements/{id}/entries")
    public ResponseEntity<?> addEntry(@PathVariable Long id, @RequestBody EntryRequest req) {
        return handle(() -> service.addEntry(id, req));
    }

    @PutMapping("/api/admin/achievements/entries/{entryId}")
    public ResponseEntity<?> updateEntry(@PathVariable Long entryId, @RequestBody EntryRequest req) {
        return handle(() -> service.updateEntry(entryId, req));
    }

    @PostMapping("/api/admin/achievements/entries/{entryId}/split")
    public ResponseEntity<?> splitEntry(@PathVariable Long entryId) {
        return handle(() -> service.splitEntry(entryId));
    }

    @DeleteMapping("/api/admin/achievements/entries/{entryId}")
    public ResponseEntity<?> deleteEntry(@PathVariable Long entryId) {
        return handle(() -> service.deleteEntry(entryId));
    }

    @PostMapping(value = "/api/admin/achievements/{id}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@PathVariable Long id,
                                    @RequestParam MultipartFile file,
                                    @RequestParam(required = false) MultipartFile thumb,
                                    @RequestParam String category,
                                    @RequestParam(required = false) Long entryId,
                                    Authentication auth) {
        try {
            return ResponseEntity.ok(service.upload(id, entryId, category, file, thumb, auth.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(StatusResponse.fail("파일을 올리지 못했어요."));
        }
    }

    @PatchMapping("/api/admin/achievements/files/{fileId}")
    public ResponseEntity<?> moveFile(@PathVariable Long fileId, @RequestBody Map<String, String> body) {
        return handle(() -> service.moveFile(fileId, body.get("category")));
    }

    @DeleteMapping("/api/admin/achievements/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId) {
        return handle(() -> {
            service.deleteFile(fileId);
            return StatusResponse.success();
        });
    }

    @GetMapping("/api/admin/achievements/files/{fileId}/thumb")
    public ResponseEntity<byte[]> thumb(@PathVariable Long fileId) {
        try {
            byte[] bytes = service.thumbnail(fileId);
            if (bytes == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG)
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400").body(bytes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // 크게 보기용 원본 (화면에서 사진을 눌렀을 때)
    @GetMapping("/api/admin/achievements/files/{fileId}/raw")
    public ResponseEntity<StreamingResponseBody> raw(@PathVariable Long fileId) {
        try {
            AchievementFile f = service.fileMeta(fileId);
            Path path = service.filePath(f);
            if (!Files.exists(path)) return ResponseEntity.notFound().build();
            MediaType type = f.getContentType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(f.getContentType());
            return ResponseEntity.ok().contentType(type).contentLength(Files.size(path))
                    .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                    .body(out -> Files.copy(path, out));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/api/admin/achievements/download-token")
    public ResponseEntity<?> downloadToken(@RequestBody DownloadRequest req) {
        return handle(() -> Map.of("url", "/api/achievement-download/" + service.issueTicket(req)));
    }

    // 로그인 없이 열리는 주소 — 대신 관리자가 방금 받은 한 번용 토큰(2분)이 있어야 한다
    @GetMapping("/api/achievement-download/{token}")
    public ResponseEntity<StreamingResponseBody> download(@PathVariable String token) {
        try {
            AchievementService.Ticket t = service.redeem(token);
            if ("FILE".equals(t.kind())) {
                AchievementFile f = service.fileMeta(t.id());
                Path path = service.filePath(f);
                if (!Files.exists(path)) return message(HttpStatus.NOT_FOUND, "파일이 없어요.");
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_OCTET_STREAM)
                        .contentLength(Files.size(path))
                        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                                .filename(f.getOriginalName(), StandardCharsets.UTF_8).build().toString())
                        .body(out -> Files.copy(path, out));
            }
            AchievementService.ExportPlan plan = "YEAR".equals(t.kind()) ? service.planYear(t.year()) : service.planRecord(t.id());
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/zip"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(plan.zipName(), StandardCharsets.UTF_8).build().toString())
                    .body(out -> service.writeZip(plan, out));
        } catch (IllegalArgumentException e) {
            return message(HttpStatus.GONE, e.getMessage());
        } catch (Exception e) {
            return message(HttpStatus.INTERNAL_SERVER_ERROR, "내려받지 못했어요.");
        }
    }

    private static ResponseEntity<StreamingResponseBody> message(HttpStatus status, String text) {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.status(status).contentType(MediaType.parseMediaType("text/plain;charset=UTF-8"))
                .body(out -> out.write(bytes));
    }
}
