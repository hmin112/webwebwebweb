package kr.co.devsign.devsign_backend.dto.member;

public record OfficerContactResponse(
        String role,      // 회장 / 부회장 / 총무
        String name,       // 직책 표기(예: "(회장)")를 제거한 순수 이름
        String studentId
) {
}
