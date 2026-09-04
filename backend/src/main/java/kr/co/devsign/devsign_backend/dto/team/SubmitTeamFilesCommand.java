package kr.co.devsign.devsign_backend.dto.team;

import org.springframework.web.multipart.MultipartFile;

public record SubmitTeamFilesCommand(
        String loginId,
        Long teamId,
        String submissionId,
        int year,
        int semester,
        int month,
        String memo,
        MultipartFile presentation,
        MultipartFile pdf,
        MultipartFile other
) {
}
