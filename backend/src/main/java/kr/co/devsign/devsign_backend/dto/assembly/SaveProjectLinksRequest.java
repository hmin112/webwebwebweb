package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

public record SaveProjectLinksRequest(
        String loginId,
        int year,
        int semester,
        List<PlanLinkDto> links
) {
}
