package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.OjClient;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

// devsign 안에서 OJ 문제를 관리(생성/숨김·표시/삭제/태그)하기 위한 관리자 전용 프록시.
// /api/admin/** 이므로 SecurityConfig의 hasRole("ADMIN") 규칙에 자동으로 포함됨(별도 보안 설정 불필요).
@RestController
@RequestMapping("/api/admin/oj")
@RequiredArgsConstructor
public class AdminOjController {

    private final OjClient ojClient;

    @GetMapping("/problems")
    public Map<String, Object> listProblems(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ojClient.adminGetProblems(keyword, limit, offset);
    }

    @GetMapping("/problems/{id}")
    public Map<String, Object> problemDetail(@PathVariable Long id) {
        return ojClient.adminGetProblemDetail(id);
    }

    @PostMapping("/problems")
    public Map<String, Object> createProblem(@RequestBody Map<String, Object> payload) {
        return ojClient.adminCreateProblem(payload);
    }

    @PutMapping("/problems/{id}")
    public Map<String, Object> updateProblem(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return ojClient.adminUpdateProblem(id, payload);
    }

    @PutMapping("/problems/{id}/visibility")
    public StatusResponse setVisibility(@PathVariable Long id, @RequestParam boolean visible) {
        ojClient.adminSetProblemVisibility(id, visible);
        return StatusResponse.success();
    }

    @DeleteMapping("/problems/{id}")
    public StatusResponse deleteProblem(@PathVariable Long id) {
        ojClient.adminDeleteProblem(id);
        return StatusResponse.success();
    }

    @PostMapping("/test-cases")
    public Map<String, Object> uploadTestCase(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "false") boolean spj
    ) {
        return ojClient.adminUploadTestCase(file, spj);
    }

    @GetMapping("/tags")
    public Map<String, Object> tags() {
        return ojClient.getTags();
    }

    // 폴더(=태그) 이름 변경 — 그 태그가 붙은 문제를 전부 찾아 태그 이름을 일괄 바꿔치기함
    @PutMapping("/folders/rename")
    public Map<String, Object> renameFolder(@RequestParam String oldName, @RequestParam String newName) {
        int updated = ojClient.adminRenameFolder(oldName.trim(), newName.trim());
        return Map.of("status", "success", "updatedCount", updated);
    }
}
