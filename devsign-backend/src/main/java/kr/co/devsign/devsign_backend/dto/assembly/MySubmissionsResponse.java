package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

public record MySubmissionsResponse(
        List<AssemblyReportResponse> reports,
        String projectTitle
) {
}
