package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.service.AssemblyService;
import kr.co.devsign.devsign_backend.dto.assembly.AssemblyReportResponse;
import kr.co.devsign.devsign_backend.dto.assembly.MySubmissionsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SavePlanRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectLinksRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesCommand;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.util.PlanTemplateGenerator;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import kr.co.devsign.devsign_backend.config.AuthGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/assembly")
@RequiredArgsConstructor
public class AssemblyController {

    private final AssemblyService assemblyService;
    private final PlanTemplateGenerator planTemplateGenerator;

    @GetMapping("/my-submissions")
    public ResponseEntity<MySubmissionsResponse> getMySubmissions(
            @RequestParam String loginId,
            @RequestParam int year,
            @RequestParam int semester
    ) {
        MySubmissionsResponse result = assemblyService.getMySubmissions(loginId, year, semester);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/periods/{year}")
    public ResponseEntity<List<SubmissionPeriodResponse>> getSubmissionPeriods(@PathVariable int year) {
        return ResponseEntity.ok(assemblyService.getSubmissionPeriods(year));
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadFile(@RequestParam String path) {
        return assemblyService.downloadFile(path);
    }

    @PostMapping("/project-title")
    public ResponseEntity<StatusResponse> saveProjectTitle(Authentication authentication, @RequestBody SaveProjectTitleRequest params) {
        AuthGuard.requireSelf(authentication, params.loginId());
        assemblyService.saveProjectTitle(params);
        return ResponseEntity.ok(StatusResponse.success());
    }

    // ✨ [2026-09-07 추가] 마이페이지 학기별 깃/노션 등 관련 링크 — 프로젝트 명과 별개로 독립 저장
    @PostMapping("/project-links")
    public ResponseEntity<StatusResponse> saveProjectLinks(Authentication authentication, @RequestBody SaveProjectLinksRequest params) {
        AuthGuard.requireSelf(authentication, params.loginId());
        assemblyService.saveProjectLinks(params);
        return ResponseEntity.ok(StatusResponse.success());
    }

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubmitFilesResponse> submitFiles(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam String reportId,
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month,
            @RequestParam String memo,
            @RequestParam(required = false) MultipartFile presentation,
            @RequestParam(required = false) MultipartFile pdf,
            @RequestParam(required = false) MultipartFile other
    ) {
        AuthGuard.requireSelf(authentication, loginId);
        try {
            SubmitFilesCommand command = new SubmitFilesCommand(
                    loginId,
                    reportId,
                    year,
                    semester,
                    month,
                    memo,
                    presentation,
                    pdf,
                    other
            );
            String message = assemblyService.submitFiles(command);
            return ResponseEntity.ok(new SubmitFilesResponse("success", message));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new SubmitFilesResponse("fail", "submit error: " + e.getMessage()));
        }
    }

    // ✨ [2026-09-02 추가] 계획서(PLAN) 웹 작성 — 임시저장(자동저장 포함)과 제출확정을 분리
    @PostMapping("/plan/save")
    public ResponseEntity<AssemblyReportResponse> savePlanDraft(Authentication authentication, @RequestBody SavePlanRequest request) {
        AuthGuard.requireSelf(authentication, request.loginId());
        return ResponseEntity.ok(assemblyService.savePlanDraft(request));
    }

    @PostMapping("/plan/submit")
    public ResponseEntity<AssemblyReportResponse> submitPlan(Authentication authentication, @RequestBody SavePlanRequest request) {
        AuthGuard.requireSelf(authentication, request.loginId());
        return ResponseEntity.ok(assemblyService.submitPlan(request));
    }

    // 다른 부원의 리포트 id를 넣어 보낸 경우(AssemblyService.findOrCreateReport) — 403으로 돌려준다
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<StatusResponse> handleForbidden(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
    }

    // ✨ [2026-09-29 추가] 계획서 파일 업로드(원본 첨부 + 양식 자동 추출) / 첨부 삭제 / 빈 양식 내려받기
    @PostMapping(value = "/plan/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPlanFile(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam String reportId,
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month,
            @RequestParam MultipartFile file
    ) {
        if (authentication == null || !loginId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail("본인 계획서에만 파일을 올릴 수 있습니다."));
        }
        try {
            return ResponseEntity.ok(assemblyService.uploadPlanFile(loginId, reportId, year, semester, month, file));
        } catch (IllegalStateException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(StatusResponse.fail("계획서 파일을 저장하지 못했습니다."));
        }
    }

    @DeleteMapping("/plan/file")
    public ResponseEntity<?> removePlanFile(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam String reportId,
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month
    ) {
        if (authentication == null || !loginId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail("본인 계획서만 수정할 수 있습니다."));
        }
        try {
            return ResponseEntity.ok(assemblyService.removePlanFile(loginId, reportId, year, semester, month));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    // ✨ [2026-09-30] 웹 계획서 PDF (커뮤니티에서 내려받기)
    @GetMapping("/plan/pdf")
    public ResponseEntity<byte[]> planPdf(@RequestParam Long reportId) {
        return assemblyService.planPdf(reportId);
    }

    @GetMapping("/plan/template")
    public ResponseEntity<byte[]> downloadPlanTemplate(@RequestParam(defaultValue = "false") boolean team) {
        byte[] docx = planTemplateGenerator.generate(team);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename(team ? "DEVSIGN_팀_계획서_양식.docx" : "DEVSIGN_계획서_양식.docx", StandardCharsets.UTF_8)
                .build());
        return new ResponseEntity<>(docx, headers, HttpStatus.OK);
    }
}
