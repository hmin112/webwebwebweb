package kr.co.devsign.devsign_backend.dto.admin;

public record AdminPeriodSubmissionResponse(
        String loginId,
        String name,
        String studentId,
        String submitDate,
        String presentationPath,
        String pdfPath,
        String otherPath,
        String memo
) {
}
