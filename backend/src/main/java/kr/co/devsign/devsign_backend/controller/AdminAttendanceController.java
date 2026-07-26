package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.attendance.AdminAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceHistoryItem;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceStartErrorResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceStartResponse;
import kr.co.devsign.devsign_backend.dto.attendance.AttendanceValidationException;
import kr.co.devsign.devsign_backend.dto.attendance.ManualAttendanceRequest;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/attendance")
@RequiredArgsConstructor
public class AdminAttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping(value = "/start", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> start(@RequestParam MultipartFile file, Authentication authentication) {
        try {
            AttendanceStartResponse response = attendanceService.startSession(file, authentication.getName());
            return ResponseEntity.ok(response);
        } catch (AttendanceValidationException e) {
            return ResponseEntity.badRequest().body(new AttendanceStartErrorResponse(e.getMessage(), e.getProblems()));
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
