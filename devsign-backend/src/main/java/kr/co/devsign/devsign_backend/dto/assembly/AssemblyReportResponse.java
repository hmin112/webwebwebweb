package kr.co.devsign.devsign_backend.dto.assembly;

public record AssemblyReportResponse(
        Long id,
        String loginId,
        int year,
        int semester,
        int month,
        String type,
        String status,
        String title,
        String memo,
        String date,
        String deadline,
        String presentationPath,
        String pdfPath,
        String otherPath
) {
}
