package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.activity.MemberActivityResponse;
import kr.co.devsign.devsign_backend.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// ✨ [2026-09-30 신규] 활동 대시보드 — 본인 것(/api/activity/me)과 관리자용 전체 표(/api/admin/activity, ADMIN만)
@RestController
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/api/activity/me")
    public ResponseEntity<MemberActivityResponse> myActivity(
            Authentication authentication,
            @RequestParam int year,
            @RequestParam int semester
    ) {
        if (authentication == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(activityService.getActivity(authentication.getName(), year, semester));
    }

    @GetMapping("/api/admin/activity")
    public ResponseEntity<List<MemberActivityResponse>> allActivity(
            @RequestParam int year,
            @RequestParam int semester
    ) {
        return ResponseEntity.ok(activityService.getAllActivity(year, semester));
    }
}
