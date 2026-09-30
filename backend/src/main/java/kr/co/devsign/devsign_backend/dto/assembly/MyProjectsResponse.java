package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

public record MyProjectsResponse(
        List<MyProjectItem> projects,
        RepresentativeProject representative
) {
}
