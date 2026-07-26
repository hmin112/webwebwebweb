package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.attendance.CheckInRequest;
import kr.co.devsign.devsign_backend.dto.attendance.CheckInResponse;
import kr.co.devsign.devsign_backend.dto.attendance.MemberAttendanceStatusResponse;
import kr.co.devsign.devsign_backend.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/status")
    public MemberAttendanceStatusResponse status(@RequestParam String loginId) {
        return attendanceService.getMemberStatus(loginId);
    }

    @PostMapping("/check-in")
    public CheckInResponse checkIn(@RequestBody CheckInRequest request) {
        return attendanceService.checkIn(request.loginId(), request.code());
    }
}
