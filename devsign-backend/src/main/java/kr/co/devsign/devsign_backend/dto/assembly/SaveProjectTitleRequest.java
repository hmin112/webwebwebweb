package kr.co.devsign.devsign_backend.dto.assembly;

public record SaveProjectTitleRequest(
        String loginId,
        int year,
        int semester,
        String title
) {
}
