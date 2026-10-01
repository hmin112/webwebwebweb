package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.attendance.AdminAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceStartErrorResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceStartResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceValidationException;
import kr.co.devsign.devsign_backend.dto.attendance.DiscordAttendanceStartRequest;
import kr.co.devsign.devsign_backend.dto.attendance.ManualAttendanceRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
public class AdminAttendanceController {

    private final AttendanceService attendanceService;
    private final kr.co.devsign.devsign_backend.service.AssemblyNoticeService assemblyNoticeService;

    // ✨ [2026-10-01] 그 달 총회 공지(디스코드 동아리공지 채널)를 자동으로 찾아 미리 보여준다 — 출석 시작 전에 확인용
    @GetMapping("/notice")
    public ResponseEntity<?> findNotice(@RequestParam int year, @RequestParam int month) {
        try {
            return ResponseEntity.ok(assemblyNoticeService.findNotice(year, month)
                    .<Object>map(n -> java.util.Map.of("found", true, "notice", n))
                    .orElseGet(() -> java.util.Map.of("found", false, "message", month + "월 총회 공지를 동아리공지 채널에서 찾지 못했어요.")));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse("디스코드 공지를 읽지 못했어요: " + e.getMessage()));
        }
    }

    // ✨ [2026-10-01] 그 달 총회 공지에 ✅ 반응한 사람들로 출석 시작 (메시지 ID를 직접 넣지 않아도 됨)
    @PostMapping("/start-from-notice")
    public ResponseEntity<?> startFromNotice(@RequestBody java.util.Map<String, Integer> request, Authentication authentication) {
        Integer year = request.get("year"), month = request.get("month");
        if (year == null || month == null) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse("연도와 월을 알려주세요."));
        }
        try {
            var notice = assemblyNoticeService.findNotice(year, month);
            if (notice.isEmpty()) {
                return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse(month + "월 총회 공지를 동아리공지 채널에서 찾지 못했어요. 메시지 ID로 직접 시작해 주세요."));
            }
            return ResponseEntity.ok(attendanceService.startSessionFromDiscordMessage(notice.get().messageId(), authentication.getName()));
        } catch (AttendanceValidationException e) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse("디스코드 공지를 읽지 못했어요: " + e.getMessage()));
        }
    }

    // 디스코드 메시지에 ✅ 반응을 남긴 사람들을 대상자로 출석을 시작 (엑셀 업로드 방식은 제거됨)
    @PostMapping("/start-from-discord")
    public ResponseEntity<?> startFromDiscord(@RequestBody DiscordAttendanceStartRequest request, Authentication authentication) {
        try {
            AttendanceStartResponse response = attendanceService.startSessionFromDiscordMessage(request.messageId(), authentication.getName());
            return ResponseEntity.ok(response);
        } catch (AttendanceValidationException e) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/status")
    public AdminAttendanceStatusResponse status() {
        return attendanceService.getAdminStatus();
    }

    @PostMapping("/{sessionId}/close")
    public ResponseEntity<StatusResponse> close(@PathVariable Long sessionId) {
        attendanceService.closeSession(sessionId);
        return ResponseEntity.ok(StatusResponse.success());
    }

    @GetMapping("/history")
    public List<AttendanceHistoryItem> history() {
        return attendanceService.getHistory();
    }

    @GetMapping("/history/{sessionId}/download")
    public ResponseEntity<byte[]> downloadHistory(@PathVariable Long sessionId) {
        return attendanceService.downloadHistoryExcel(sessionId);
    }

    @DeleteMapping("/history/{sessionId}")
    public ResponseEntity<StatusResponse> deleteHistory(@PathVariable Long sessionId) {
        try {
            attendanceService.deleteHistorySession(sessionId);
            return ResponseEntity.ok(StatusResponse.success());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PutMapping("/{sessionId}/targets/{loginId}")
    public ResponseEntity<?> setManualAttendance(
            @PathVariable Long sessionId,
            @PathVariable String loginId,
            @RequestBody ManualAttendanceRequest request
    ) {
        try {
            attendanceService.setManualAttendance(sessionId, loginId, request.checkedIn());
            return ResponseEntity.ok(StatusResponse.success());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }
}
