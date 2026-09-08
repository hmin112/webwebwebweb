package kr.co.devsign.devsign_backend.dto.assembly;

import java.time.LocalDate;
import java.util.List;

public record AssemblyBannerResponse(
        Long id,
        int year,
        int month,
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
