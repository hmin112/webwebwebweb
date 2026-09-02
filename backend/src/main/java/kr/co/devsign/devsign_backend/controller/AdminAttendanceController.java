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
