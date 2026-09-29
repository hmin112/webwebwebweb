package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

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

    // ✨ [2026-09-29] 부원끼리 서로의 제출 코드를 참고할 수 있게 서비스 계정으로 조회한다.
    // 단, 동아리 부원 계정(dv_)의 일반 문제 제출만 — 서비스/관리자 계정이 문제 등록 때 올린 모범답안 검증
    // 제출이나 대회 제출은 보여주지 않는다.
    public Map<String, Object> getSubmission(String loginId, String submissionId) {
        Map<String, Object> submission = new HashMap<>(ojClient.getSubmissionAsService(submissionId));
        String username = String.valueOf(submission.getOrDefault("username", ""));
        if (!username.startsWith(MEMBER_PREFIX) || submission.get("contest") != null) {
            throw new OjClient.OjApiException("열람할 수 없는 제출입니다.");
        }
        decorateWithMember(submission, loginId, memberIndex());
        return submission;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getMemberSubmissionList(String loginId, String problemDisplayId, int limit) {
        Map<String, Object> data = new HashMap<>(ojClient.getMemberSubmissionList(resolveAppkey(loginId), problemDisplayId, limit));
        Map<String, Member> members = memberIndex();
        Object raw = data.get("results");
        List<Map<String, Object>> results = new ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> m)) continue;
                Map<String, Object> row = new HashMap<>((Map<String, Object>) m);
                if (!String.valueOf(row.getOrDefault("username", "")).startsWith(MEMBER_PREFIX)) continue;
                decorateWithMember(row, loginId, members);
                results.add(row);
            }
        }
        data.put("results", results);
        return data;
    }

    private static final String MEMBER_PREFIX = "dv_";

    private Map<String, Member> memberIndex() {
        return memberRepository.findAll().stream()
                .filter(m -> m.getLoginId() != null)
                .collect(Collectors.toMap(m -> m.getLoginId().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));
    }

    // OJ 아이디(dv_로그인아이디 소문자)를 동아리 부원 정보로 바꿔 붙인다 — 화면에는 OJ 아이디 대신 이름/학번을 보여준다
    private void decorateWithMember(Map<String, Object> row, String viewerLoginId, Map<String, Member> members) {
        String username = String.valueOf(row.getOrDefault("username", ""));
        String key = username.substring(MEMBER_PREFIX.length());
        Member member = members.get(key);
        row.put("memberName", member != null && !member.isDeleted() ? member.getName() : "탈퇴한 부원");
        row.put("memberStudentId", member != null && !member.isDeleted() ? member.getStudentId() : null);
        row.put("mine", viewerLoginId != null && key.equals(viewerLoginId.toLowerCase(Locale.ROOT)));
        row.remove("ip");
    }

    public Map<String, Object> getSubmissionList(String loginId, String problemDisplayId, int limit) {
        return ojClient.getSubmissionList(resolveAppkey(loginId), problemDisplayId, limit);
    }

    // 태그(=폴더) 목록은 회원별 appkey가 필요 없는 조회라 서비스 계정으로 바로 조회
    public Map<String, Object> getTags() {
        return ojClient.getTags();
    }
}
