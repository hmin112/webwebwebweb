package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.officer.OfficerTermDto;
import kr.co.devsign.devsign_backend.service.OfficerHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// ✨ [2026-09-30 신규] 역대 임원진 — 조회는 누구나, 연도별 입력은 관리자(/api/admin/**)
@RestController
@RequiredArgsConstructor
public class OfficerHistoryController {

    private final OfficerHistoryService officerHistoryService;

    @GetMapping("/api/officers/history")
    public List<OfficerTermDto> history() {
        return officerHistoryService.list();
    }

    @PutMapping("/api/admin/officers/{year}")
    public ResponseEntity<?> saveYear(@PathVariable int year, @RequestBody List<OfficerTermDto> officers) {
        try {
            return ResponseEntity.ok(officerHistoryService.saveYear(year, officers));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }
}
