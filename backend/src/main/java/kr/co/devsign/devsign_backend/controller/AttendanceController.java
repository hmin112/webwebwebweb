package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.attendance.CheckInRequest;
import kr.co.devsign.devsign_backend.dto.attendance.CheckInResponse;
import kr.co.devsign.devsign_backend.dto.attendance.MemberAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.service.AttendanceService;
import kr.co.devsign.devsign_backend.config.AuthGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/status")
    public MemberAttendanceStatusResponse status(Authentication authentication, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        return attendanceService.getMemberStatus(loginId);
    }

    @PostMapping("/check-in")
    public CheckInResponse checkIn(Authentication authentication, @RequestBody CheckInRequest request) {
        // ✨ [2026-09-29] 인증번호를 알아도 로그인한 본인 이름으로만 출석 처리된다 (대리 출석 차단)
        AuthGuard.requireSelf(authentication, request.loginId());
        return attendanceService.checkIn(request.loginId(), request.code());
    }
}
