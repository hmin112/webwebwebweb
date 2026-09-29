package kr.co.devsign.devsign_backend.dto.assembly;

import java.util.List;

// 계획서 파일 업로드 결과 — 저장된 제출 정보(개인: AssemblyReportResponse, 팀: TeamSubmissionResponse)와
// 파일에서 추출한 내용, 추출 중 확인이 필요한 항목 안내를 함께 돌려준다
public record PlanFileUploadResponse<T>(
        T submission,
        ExtractedPlanDto extracted,
        boolean templateRecognized,
        List<String> warnings
) {
}
