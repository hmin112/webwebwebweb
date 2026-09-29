package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.oj.SubmitCodeRequest;
import kr.co.devsign.devsign_backend.service.OjService;
import kr.co.devsign.devsign_backend.config.AuthGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// oj.devsign.co.kr(QingdaoU/OnlineJudge)를 내부 마이크로서비스로 호출하는 프록시.
// 로그인한 회원이면 누구나 접근 가능 (SecurityConfig의 anyRequest().authenticated()에 자동 포함).
@RestController
@RequestMapping("/api/oj")
@RequiredArgsConstructor
public class OjController {

    private final OjService ojService;

    @GetMapping("/problems")
    public Map<String, Object> problems(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String difficulty,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        AuthGuard.requireSelf(authentication, loginId);
        return ojService.getProblems(loginId, keyword, tag, difficulty, limit, offset);
    }

    @GetMapping("/problems/{displayId}")
    public Map<String, Object> problemDetail(Authentication authentication, @PathVariable String displayId, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        return ojService.getProblemDetail(loginId, displayId);
    }

    @GetMapping("/languages")
    public Map<String, Object> languages(Authentication authentication, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        return ojService.getLanguages(loginId);
    }

    @PostMapping("/submissions")
    public Map<String, Object> submit(Authentication authentication, @RequestBody SubmitCodeRequest request) {
        // 제출은 반드시 본인 OJ 계정으로만
        AuthGuard.requireSelf(authentication, request.loginId());
        return ojService.submit(request.loginId(), request.problemId(), request.language(), request.code());
    }

    @GetMapping("/submissions/{id}")
    public Map<String, Object> submission(Authentication authentication, @PathVariable String id, @RequestParam String loginId) {
        AuthGuard.requireSelf(authentication, loginId);
        // ✨ [2026-09-29] 다른 부원의 제출 코드도 참고용으로 열람 가능 (OjService.getSubmission 참고)
        return ojService.getSubmission(loginId, id);
    }

    @GetMapping("/submissions")
    public Map<String, Object> submissions(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam(required = false) String problemDisplayId,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "mine") String scope
    ) {
        AuthGuard.requireSelf(authentication, loginId);
        // scope=all → 동아리 부원 전체의 제출 목록 (참고용), 그 외 → 내 제출만
        if ("all".equals(scope)) {
            return ojService.getMemberSubmissionList(loginId, problemDisplayId, Math.min(Math.max(limit, 1), 100));
        }
        return ojService.getSubmissionList(loginId, problemDisplayId, limit);
    }

    // ✨ [신규] 문제 태그(=폴더) 목록 — 문제 목록 화면의 폴더/태그 필터에 사용
    @GetMapping("/tags")
    public Map<String, Object> tags() {
        return ojService.getTags();
    }
}
