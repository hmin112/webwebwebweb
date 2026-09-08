package kr.co.devsign.devsign_backend.dto.assembly;

import java.time.LocalDate;
import java.util.List;

public record SaveAssemblyBannerRequest(
        String title,
        List<String> notices,
        List<String> agenda,
        Integer attendanceCount,
        String quote,
        String targetEndTime,
        String nextAssemblyLabel,
        LocalDate nextAssemblyDate
) {
}
