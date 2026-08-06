package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.oj.SubmitCodeRequest;
import kr.co.devsign.devsign_backend.service.OjService;
import lombok.RequiredArgsConstructor;
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
            @RequestParam String loginId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String difficulty,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ojService.getProblems(loginId, keyword, tag, difficulty, limit, offset);
    }

    @GetMapping("/problems/{displayId}")
    public Map<String, Object> problemDetail(@PathVariable String displayId, @RequestParam String loginId) {
        return ojService.getProblemDetail(loginId, displayId);
    }

    @GetMapping("/languages")
    public Map<String, Object> languages(@RequestParam String loginId) {
        return ojService.getLanguages(loginId);
    }

    @PostMapping("/submissions")
    public Map<String, Object> submit(@RequestBody SubmitCodeRequest request) {
        return ojService.submit(request.loginId(), request.problemId(), request.language(), request.code());
    }

    @GetMapping("/submissions/{id}")
    public Map<String, Object> submission(@PathVariable String id, @RequestParam String loginId) {
        return ojService.getSubmission(loginId, id);
    }

    @GetMapping("/submissions")
    public Map<String, Object> submissions(
            @RequestParam String loginId,
            @RequestParam(required = false) String problemDisplayId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return ojService.getSubmissionList(loginId, problemDisplayId, limit);
    }
}
