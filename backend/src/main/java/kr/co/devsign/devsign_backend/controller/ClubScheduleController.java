package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.schedule.ScheduleRequest;
import kr.co.devsign.devsign_backend.dto.schedule.ScheduleResponse;
import kr.co.devsign.devsign_backend.dto.schedule.ExternalScheduleResponse;
import kr.co.devsign.devsign_backend.service.ClubScheduleService;
import kr.co.devsign.devsign_backend.service.ExternalScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// ✨ [2026-09-30 신규] 캘린더 일정 — 조회는 누구나(비로그인은 공개 일정만), 추가·수정·삭제는 관리자(/api/admin/**)
@RestController
@RequiredArgsConstructor
public class ClubScheduleController {

    private final ClubScheduleService scheduleService;
    private final ExternalScheduleService externalScheduleService;

    // ✨ 조선대 학사일정 + SW중심대학 지원 프로그램 신청기간 (누구나 조회)
    @GetMapping("/api/schedules/external")
    public List<ExternalScheduleResponse> external() {
        return externalScheduleService.list();
    }

    @GetMapping("/api/schedules")
    public List<ScheduleResponse> list(Authentication authentication) {
        boolean loggedIn = authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        return scheduleService.list(loggedIn);
    }

    @PostMapping("/api/admin/schedules")
    public ResponseEntity<?> create(Authentication authentication, @RequestBody ScheduleRequest request) {
        try {
            return ResponseEntity.ok(scheduleService.create(request, authentication == null ? null : authentication.getName()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PutMapping("/api/admin/schedules/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ScheduleRequest request) {
        try {
            return ResponseEntity.ok(scheduleService.update(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @DeleteMapping("/api/admin/schedules/{id}")
    public ResponseEntity<StatusResponse> delete(@PathVariable Long id) {
        scheduleService.delete(id);
        return ResponseEntity.ok(StatusResponse.success());
    }
}
