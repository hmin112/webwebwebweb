package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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

    // ✨ [2026-09-29] 부원끼리 서로의 제출을 참고할 수 있게 서비스 계정으로 조회한다.
    // - 결과·점수·시간/메모리·통과한 테스트 수는 누구나 볼 수 있고,
    // - 코드는 본인 제출이거나 "보는 사람이 그 문제를 맞혔을 때"만 내려준다(백준 방식, 과제 베끼기 방지).
    // 동아리 부원 계정(dv_)의 일반 문제 제출만 대상 — 서비스/관리자 계정의 모범답안 검증 제출이나 대회 제출은 제외.
    public Map<String, Object> getSubmission(String loginId, String submissionId) {
        Map<String, Object> submission = new HashMap<>(ojClient.getSubmissionAsService(submissionId));
        String username = String.valueOf(submission.getOrDefault("username", ""));
        if (!username.startsWith(MEMBER_PREFIX) || submission.get("contest") != null) {
            throw new OjClient.OjApiException("열람할 수 없는 제출입니다.");
        }
        decorateWithMember(submission, loginId, memberIndex());

        boolean mine = Boolean.TRUE.equals(submission.get("mine"));
        String problemPk = String.valueOf(submission.get("problem"));
        boolean codeVisible = mine || solvedProblems(loginId).pkSet().contains(problemPk);

        addTestCaseSummary(submission);
        // 관리자 권한으로 받아온 채점 상세(테스트케이스별 출력 등)는 일반 부원 화면과 맞춰 내려주지 않는다
        submission.remove("info");
        submission.remove("ip");
        if (!codeVisible) {
            submission.remove("code");
        }
        submission.put("codeVisible", codeVisible);
        return submission;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getMemberSubmissionList(String loginId, String problemDisplayId, int limit) {
        Map<String, Object> data = new HashMap<>(ojClient.getMemberSubmissionList(resolveAppkey(loginId), problemDisplayId, limit));
        Map<String, Member> members = memberIndex();
        Set<String> solvedDisplayIds = solvedProblems(loginId).displayIdSet();
        Object raw = data.get("results");
        List<Map<String, Object>> results = new ArrayList<>();
        if (raw instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> m)) continue;
                Map<String, Object> row = new HashMap<>((Map<String, Object>) m);
                if (!String.valueOf(row.getOrDefault("username", "")).startsWith(MEMBER_PREFIX)) continue;
                decorateWithMember(row, loginId, members);
                row.put("codeVisible", Boolean.TRUE.equals(row.get("mine"))
                        || solvedDisplayIds.contains(String.valueOf(row.get("problem"))));
                results.add(row);
            }
        }
        data.put("results", results);
        return data;
    }

    private record SolvedProblems(Set<String> pkSet, Set<String> displayIdSet) {}

    // 보는 사람이 정답(status 0)을 받은 문제 — ACM/OI 규칙 모두. OI는 만점일 때 status 0이 된다.
    @SuppressWarnings("unchecked")
    private SolvedProblems solvedProblems(String loginId) {
        Set<String> pks = new HashSet<>();
        Set<String> displayIds = new HashSet<>();
        Map<String, Object> profile = ojClient.getProfile(resolveAppkey(loginId));
        for (String key : List.of("acm_problems_status", "oi_problems_status")) {
            if (!(profile.get(key) instanceof Map<?, ?> status)) continue;
            if (!(status.get("problems") instanceof Map<?, ?> problems)) continue;
            for (Map.Entry<?, ?> entry : problems.entrySet()) {
                if (!(entry.getValue() instanceof Map<?, ?> p)) continue;
                Object st = p.get("status");
                if (st instanceof Number n && n.intValue() == 0) {
                    pks.add(String.valueOf(entry.getKey()));
                    if (p.get("_id") != null) displayIds.add(String.valueOf(p.get("_id")));
                }
            }
        }
        return new SolvedProblems(pks, displayIds);
    }

    // 채점 상세(info.data)에서 테스트케이스 통과 개수만 요약해 붙인다 (result 0 = 통과)
    @SuppressWarnings("unchecked")
    private void addTestCaseSummary(Map<String, Object> submission) {
        if (!(submission.get("info") instanceof Map<?, ?> info)) return;
        if (!(info.get("data") instanceof List<?> cases) || cases.isEmpty()) return;
        int passed = 0;
        for (Object c : cases) {
            if (c instanceof Map<?, ?> tc && tc.get("result") instanceof Number n && n.intValue() == 0) passed++;
        }
        submission.put("passedCases", passed);
        submission.put("totalCases", cases.size());
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
