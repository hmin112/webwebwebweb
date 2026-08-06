package kr.co.devsign.devsign_backend.dto.oj;

// problemId는 문제 상세 응답의 숫자형 "id"(PK) — 목록/URL에 쓰는 문자열 "_id"(표시용 번호)가 아니다.
public record SubmitCodeRequest(
        String loginId,
        long problemId,
        String language,
        String code
) {
}
