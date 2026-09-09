package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.fee.FeeMonthResponse;
import kr.co.devsign.devsign_backend.dto.fee.SaveFeeSettingRequest;
import kr.co.devsign.devsign_backend.service.FeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

// ✨ [2026-09-09 신규] 회비 관리 — /api/admin/** 아래라 SecurityConfig의 ADMIN 매처가 그대로 적용됨
@RestController
@RequestMapping("/api/admin/fees")
@RequiredArgsConstructor
public class FeeController {

    private final FeeService feeService;

    @GetMapping("/{year}/{month}")
    public FeeMonthResponse getMonth(@PathVariable int year, @PathVariable int month) {
        return feeService.getMonth(year, month);
    }

    @PutMapping("/{year}/{month}/settings")
    public FeeMonthResponse saveSetting(
            @PathVariable int year,
            @PathVariable int month,
            @RequestBody SaveFeeSettingRequest request
    ) {
        return feeService.saveSetting(year, month, request);
    }

    // 지난 달 명단 만들기 / 새로 들어온 부원 추가 (기존 기록은 건드리지 않음)
    @PostMapping("/{year}/{month}/roster")
    public FeeMonthResponse syncRoster(@PathVariable int year, @PathVariable int month) {
        return feeService.syncRoster(year, month);
    }

    // loginId는 한글/특수문자가 들어간 계정이 실제로 있어서(경로 변수로 두면 인코딩 문제가 생김)
    // 쿼리 파라미터로 받는다.
    @PutMapping("/{year}/{month}/payments")
    public FeeMonthResponse togglePaid(
            @PathVariable int year,
            @PathVariable int month,
            @RequestParam String loginId
    ) {
        return feeService.togglePaid(year, month, loginId);
    }

    @DeleteMapping("/{year}/{month}/roster")
    public FeeMonthResponse removeFromRoster(
            @PathVariable int year,
            @PathVariable int month,
            @RequestParam String loginId
    ) {
        return feeService.removeFromRoster(year, month, loginId);
    }
}
