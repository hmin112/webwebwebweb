package kr.co.devsign.devsign_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * devsign 백엔드가 기존 oj.devsign.co.kr(QingdaoU/OnlineJudge) 백엔드를 discord-bot과 동일한 방식으로
 * 내부 마이크로서비스처럼 호출하기 위한 클라이언트. 인증은 OJ가 제공하는 OpenAPI appkey 메커니즘
 * (헤더 Appkey: <token>)을 그대로 사용 — 세션/CSRF가 필요 없다.
 */
@Component
@RequiredArgsConstructor
public class OjClient {

    private final RestTemplate restTemplate;

    @Value("${oj.backend.url}")
    private String ojBaseUrl;

    @Value("${oj.service.appkey}")
    private String serviceAppkey;

    // ---------- 공통 ----------

    private HttpHeaders appkeyHeaders(String appkey) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Appkey", appkey);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> unwrap(ResponseEntity<Map> response) {
        Map<String, Object> body = response.getBody();
        if (body == null) {
            return Collections.emptyMap();
        }
        Object error = body.get("error");
        if (error != null) {
            throw new OjApiException(String.valueOf(error));
        }
        Object data = body.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        Map<String, Object> wrapped = new HashMap<>();
        wrapped.put("value", data);
        return wrapped;
    }

    public static class OjApiException extends RuntimeException {
        public OjApiException(String message) {
            super(message);
        }
    }

    // ---------- 관리자(서비스 계정) API : 회원별 OJ 계정 자동 발급용 ----------

    public void createUser(String username, String password, String email, String realName) {
        Map<String, Object> body = Map.of("users", List.of(List.of(username, password, email, realName)));
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, appkeyHeaders(serviceAppkey));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ojBaseUrl + "/api/admin/user", HttpMethod.POST, entity, Map.class);
            unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("OJ 계정 생성 실패: " + e.getResponseBodyAsString());
        }
    }

    @SuppressWarnings("unchecked")
    public Long findUserIdByUsername(String username) {
        String url = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/admin/user")
                .queryParam("keyword", username)
                .toUriString();
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(serviceAppkey));
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        Map<String, Object> data = unwrap(response);
        List<Map<String, Object>> results = (List<Map<String, Object>>) data.get("results");
        if (results == null) {
            return null;
        }
        for (Map<String, Object> row : results) {
            if (username.equals(row.get("username"))) {
                return ((Number) row.get("id")).longValue();
            }
        }
        return null;
    }

    public void enableOpenApi(Long ojUserId, String username, String email, String realName) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", ojUserId);
        body.put("username", username);
        body.put("real_name", realName);
        body.put("email", email);
        body.put("admin_type", "Regular User");
        body.put("problem_permission", "None");
        body.put("open_api", true);
        body.put("two_factor_auth", false);
        body.put("is_disabled", false);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, appkeyHeaders(serviceAppkey));
        ResponseEntity<Map> response = restTemplate.exchange(
                ojBaseUrl + "/api/admin/user", HttpMethod.PUT, entity, Map.class);
        unwrap(response);
    }

    /**
     * admin/user PUT 응답은 보안상 appkey 값 자체를 절대 내려주지 않으므로(공식 admin 직렬화기가 필드 제외),
     * 방금 발급받은 임시 비밀번호로 딱 한 번 로그인해 세션을 얻은 뒤 본인 명의로 appkey를 조회해 받아온다.
     * (csrftoken 쿠키 → 로그인으로 sessionid 획득 → open_api_appkey 발급, 이 세 호출은 OJ가 공식 지원하는
     * 일반 웹 로그인 플로우 그대로다)
     */
    public String fetchAppkeyViaLogin(String username, String temporaryPassword) {
        ResponseEntity<Map> first = restTemplate.exchange(
                ojBaseUrl + "/api/profile/", HttpMethod.GET, HttpEntity.EMPTY, Map.class);
        String csrfToken = extractCookie(first.getHeaders(), "csrftoken");
        if (csrfToken == null) {
            throw new OjApiException("OJ csrftoken 쿠키를 받지 못했습니다");
        }

        HttpHeaders loginHeaders = new HttpHeaders();
        loginHeaders.setContentType(MediaType.APPLICATION_JSON);
        loginHeaders.set("X-CSRFToken", csrfToken);
        loginHeaders.set(HttpHeaders.COOKIE, "csrftoken=" + csrfToken);
        Map<String, String> loginBody = Map.of("username", username, "password", temporaryPassword);
        ResponseEntity<Map> loginResponse = restTemplate.exchange(
                ojBaseUrl + "/api/login", HttpMethod.POST,
                new HttpEntity<>(loginBody, loginHeaders), Map.class);
        unwrap(loginResponse);

        String sessionId = extractCookie(loginResponse.getHeaders(), "sessionid");
        String refreshedCsrf = extractCookie(loginResponse.getHeaders(), "csrftoken");
        if (refreshedCsrf == null) {
            refreshedCsrf = csrfToken;
        }
        if (sessionId == null) {
            throw new OjApiException("OJ 로그인에 실패해 세션을 얻지 못했습니다");
        }

        HttpHeaders appkeyHeaders = new HttpHeaders();
        appkeyHeaders.set("X-CSRFToken", refreshedCsrf);
        appkeyHeaders.set(HttpHeaders.COOKIE, "csrftoken=" + refreshedCsrf + "; sessionid=" + sessionId);
        ResponseEntity<Map> appkeyResponse = restTemplate.exchange(
                ojBaseUrl + "/api/open_api_appkey", HttpMethod.POST,
                new HttpEntity<>(appkeyHeaders), Map.class);
        Map<String, Object> data = unwrap(appkeyResponse);
        Object appkey = data.get("appkey");
        if (appkey == null) {
            throw new OjApiException("OJ appkey 발급에 실패했습니다");
        }
        return String.valueOf(appkey);
    }

    private String extractCookie(HttpHeaders headers, String name) {
        List<String> setCookies = headers.get(HttpHeaders.SET_COOKIE);
        if (setCookies == null) {
            return null;
        }
        for (String cookie : setCookies) {
            String[] parts = cookie.split(";", 2)[0].split("=", 2);
            if (parts.length == 2 && parts[0].trim().equals(name)) {
                return parts[1].trim();
            }
        }
        return null;
    }

    // ---------- 관리자(서비스 계정) API : 문제 관리 (2026-08-29 추가) ----------
    // devsign 안에서 문제 생성/숨김/삭제/태그(폴더) 관리를 하기 위한 QDUOJ 관리자 API 래퍼.
    // 계약은 실제 서버(oj.devsign.co.kr 내부 주소)에 격리된 테스트 문제를 만들었다 지우며 curl로 확인함:
    // - 생성/수정 시 spj_language, spj_code 키는 값이 null이어도 반드시 존재해야 함(없으면 400)
    // - 수정(PUT)은 GET 상세 응답을 그대로 돌려보내도 됨 (created_by 등 읽기전용 필드는 서버가 무시함)
    // - 문제 목록/상세는 관리자 전용(/api/admin/problem)이라 숨김·대회전용 문제도 모두 보임(학생용 /api/problem은 공개+비대회만 노출)

    public Map<String, Object> adminGetProblems(String keyword, int limit, int offset) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/admin/problem")
                .queryParam("limit", limit)
                .queryParam("offset", offset);
        if (keyword != null && !keyword.isBlank()) {
            builder.queryParam("keyword", keyword);
        }
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(serviceAppkey));
        ResponseEntity<Map> response = restTemplate.exchange(builder.toUriString(), HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    public Map<String, Object> adminGetProblemDetail(Long id) {
        String url = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/admin/problem")
                .queryParam("id", id)
                .toUriString();
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(serviceAppkey));
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    public Map<String, Object> adminCreateProblem(Map<String, Object> payload) {
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(normalizeProblemPayload(payload), appkeyHeaders(serviceAppkey));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ojBaseUrl + "/api/admin/problem", HttpMethod.POST, entity, Map.class);
            return unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("문제 생성 실패: " + e.getResponseBodyAsString());
        }
    }

    public Map<String, Object> adminUpdateProblem(Long id, Map<String, Object> payload) {
        Map<String, Object> body = normalizeProblemPayload(payload);
        body.put("id", id);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, appkeyHeaders(serviceAppkey));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ojBaseUrl + "/api/admin/problem", HttpMethod.PUT, entity, Map.class);
            return unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("문제 수정 실패: " + e.getResponseBodyAsString());
        }
    }

    public void adminSetProblemVisibility(Long id, boolean visible) {
        Map<String, Object> detail = adminGetProblemDetail(id);
        Map<String, Object> body = new HashMap<>(detail);
        body.put("visible", visible);
        adminUpdateProblem(id, body);
    }

    // 폴더 = 태그(자유 문자열)라 QDUOJ에 "태그 이름 변경" API가 따로 없음. 그 태그를 가진 문제를
    // 전부 찾아 하나씩 태그 이름을 바꿔치기하는 방식으로 "폴더 이름 변경"을 구현.
    @SuppressWarnings("unchecked")
    public int adminRenameFolder(String oldName, String newName) {
        Map<String, Object> list = adminGetProblems(null, 1000, 0);
        List<Map<String, Object>> results = (List<Map<String, Object>>) list.get("results");
        if (results == null) return 0;

        int updated = 0;
        for (Map<String, Object> summary : results) {
            List<String> tags = (List<String>) summary.get("tags");
            if (tags == null || !tags.contains(oldName)) continue;

            Long id = ((Number) summary.get("id")).longValue();
            Map<String, Object> detail = adminGetProblemDetail(id);
            List<String> currentTags = (List<String>) detail.get("tags");
            List<String> newTags = new ArrayList<>(currentTags != null ? currentTags : List.of());
            newTags.remove(oldName);
            if (!newTags.contains(newName)) {
                newTags.add(newName);
            }

            Map<String, Object> body = new HashMap<>(detail);
            body.put("tags", newTags);
            adminUpdateProblem(id, body);
            updated++;
        }
        return updated;
    }

    public void adminDeleteProblem(Long id) {
        String url = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/admin/problem")
                .queryParam("id", id)
                .toUriString();
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(serviceAppkey));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
            unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("문제 삭제 실패: " + e.getResponseBodyAsString());
        }
    }

    public Map<String, Object> adminUploadTestCase(MultipartFile file, boolean spj) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("spj", String.valueOf(spj));
        body.add("file", file.getResource());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("Appkey", serviceAppkey);
        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ojBaseUrl + "/api/admin/test_case", HttpMethod.POST, entity, Map.class);
            return unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("테스트케이스 업로드 실패: " + e.getResponseBodyAsString());
        }
    }

    // 문제 태그 = devsign OJ 탭의 "폴더" 개념으로 그대로 재사용 (QDUOJ에 별도 폴더 기능이 없어
    // 이미 있는 자유 태그 필드를 그대로 활용 — 새 테이블/개념을 만들지 않음)
    public Map<String, Object> getTags() {
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(serviceAppkey));
        ResponseEntity<Map> response = restTemplate.exchange(
                ojBaseUrl + "/api/problem/tags", HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    // spj_language/spj_code 키가 없으면 QDUOJ가 400을 반환하므로(실제 문제 아님) 항상 채워서 보냄
    private Map<String, Object> normalizeProblemPayload(Map<String, Object> payload) {
        Map<String, Object> body = new HashMap<>(payload);
        body.putIfAbsent("spj_language", null);
        body.putIfAbsent("spj_code", null);
        return body;
    }

    // ---------- 학생 본인 명의(appkey) API ----------

    public Map<String, Object> getProblems(String appkey, String keyword, String tag, String difficulty, int limit, int offset) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/problem")
                .queryParam("limit", limit)
                .queryParam("offset", offset);
        if (keyword != null && !keyword.isBlank()) {
            builder.queryParam("keyword", keyword);
        }
        if (tag != null && !tag.isBlank()) {
            builder.queryParam("tag", tag);
        }
        if (difficulty != null && !difficulty.isBlank()) {
            builder.queryParam("difficulty", difficulty);
        }
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(appkey));
        ResponseEntity<Map> response = restTemplate.exchange(
                builder.toUriString(), HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    // displayId는 OJ 문제의 "_id"(예: "1000") — 목록/URL 라우팅용. 실제 제출 시엔 이 값이 아니라
    // 이 응답에 함께 들어있는 숫자형 "id"(PK)를 써야 한다 (OJ의 SubmissionAPI가 PK 기준으로 조회함).
    public Map<String, Object> getProblemDetail(String appkey, String displayId) {
        String url = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/problem")
                .queryParam("problem_id", displayId)
                .toUriString();
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(appkey));
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    public Map<String, Object> getLanguages(String appkey) {
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(appkey));
        ResponseEntity<Map> response = restTemplate.exchange(
                ojBaseUrl + "/api/languages", HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    // problemPk: 문제 상세 응답의 숫자형 "id" 필드 (display id인 "_id"가 아님)
    public Map<String, Object> createSubmission(String appkey, long problemPk, String language, String code) {
        Map<String, Object> body = Map.of(
                "problem_id", problemPk,
                "language", language,
                "code", code
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, appkeyHeaders(appkey));
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    ojBaseUrl + "/api/submission", HttpMethod.POST, entity, Map.class);
            return unwrap(response);
        } catch (HttpClientErrorException e) {
            throw new OjApiException("제출 실패: " + e.getResponseBodyAsString());
        }
    }

    public Map<String, Object> getSubmission(String appkey, String submissionId) {
        String url = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/submission")
                .queryParam("id", submissionId)
                .toUriString();
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(appkey));
        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }

    public Map<String, Object> getSubmissionList(String appkey, String problemDisplayId, int limit) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(ojBaseUrl + "/api/submissions")
                .queryParam("limit", limit)
                .queryParam("myself", 1);
        if (problemDisplayId != null && !problemDisplayId.isBlank()) {
            builder.queryParam("problem_id", problemDisplayId);
        }
        HttpEntity<Void> entity = new HttpEntity<>(appkeyHeaders(appkey));
        ResponseEntity<Map> response = restTemplate.exchange(
                builder.toUriString(), HttpMethod.GET, entity, Map.class);
        return unwrap(response);
    }
}
