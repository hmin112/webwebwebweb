package kr.co.devsign.devsign_backend.dto.assembly;

// key가 비어 있으면 직접 고른 대표를 지우고 자동 선택으로 되돌린다
public record SaveRepresentativeRequest(
        String loginId,
        int year,
        int semester,
        String key
) {
}
