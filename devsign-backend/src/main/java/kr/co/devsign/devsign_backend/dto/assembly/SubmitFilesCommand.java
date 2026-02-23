package kr.co.devsign.devsign_backend.dto.assembly;

import org.springframework.web.multipart.MultipartFile;

public record SubmitFilesCommand(
        String loginId,
        String reportId,
        int year,
        int semester,
        int month,
        String memo,
        MultipartFile presentation,
        MultipartFile pdf,
        MultipartFile other
) {
}
