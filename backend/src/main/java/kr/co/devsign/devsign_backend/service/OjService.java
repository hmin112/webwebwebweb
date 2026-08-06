package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class OjService {

    private final MemberRepository memberRepository;
    private final OjAccountService ojAccountService;
    private final OjClient ojClient;

    private String resolveAppkey(String loginId) {
        Member member = memberRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));
        return ojAccountService.ensureAppkey(member);
    }

    public Map<String, Object> getProblems(String loginId, String keyword, String tag, String difficulty, int limit, int offset) {
        return ojClient.getProblems(resolveAppkey(loginId), keyword, tag, difficulty, limit, offset);
    }

    public Map<String, Object> getProblemDetail(String loginId, String displayId) {
        return ojClient.getProblemDetail(resolveAppkey(loginId), displayId);
    }

    public Map<String, Object> getLanguages(String loginId) {
        return ojClient.getLanguages(resolveAppkey(loginId));
    }

    public Map<String, Object> submit(String loginId, long problemId, String language, String code) {
        return ojClient.createSubmission(resolveAppkey(loginId), problemId, language, code);
    }

    public Map<String, Object> getSubmission(String loginId, String submissionId) {
        return ojClient.getSubmission(resolveAppkey(loginId), submissionId);
    }

    public Map<String, Object> getSubmissionList(String loginId, String problemDisplayId, int limit) {
        return ojClient.getSubmissionList(resolveAppkey(loginId), problemDisplayId, limit);
    }
}
