package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.team.SaveTeamPlanRequest;
import kr.co.devsign.devsign_backend.dto.team.SubmitTeamFilesCommand;
import kr.co.devsign.devsign_backend.dto.team.TeamSubmissionResponse;
import kr.co.devsign.devsign_backend.service.TeamSubmissionService;
import kr.co.devsign.devsign_backend.config.AuthGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/team-submissions")
@RequiredArgsConstructor
public class TeamSubmissionController {

    private final TeamSubmissionService teamSubmissionService;

    @GetMapping("/my")
    public ResponseEntity<List<TeamSubmissionResponse>> getMySubmissions(
            @RequestParam Long teamId,
            @RequestParam int year,
            @RequestParam int semester
    ) {
        return ResponseEntity.ok(teamSubmissionService.getMySubmissions(teamId, year, semester));
    }

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubmitFilesResponse> submitFiles(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam Long teamId,
            @RequestParam String submissionId,
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
            SubmitTeamFilesCommand command = new SubmitTeamFilesCommand(
                    loginId, teamId, submissionId, year, semester, month, memo, presentation, pdf, other
            );
            String message = teamSubmissionService.submitFiles(command);
            return ResponseEntity.ok(new SubmitFilesResponse("success", message));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new SubmitFilesResponse("fail", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new SubmitFilesResponse("fail", "submit error: " + e.getMessage()));
        }
    }

    @PostMapping("/plan/save")
    public ResponseEntity<?> savePlanDraft(Authentication authentication, @RequestBody SaveTeamPlanRequest request) {
        AuthGuard.requireSelf(authentication, request.loginId());
        try {
            return ResponseEntity.ok(teamSubmissionService.savePlanDraft(request));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/plan/submit")
    public ResponseEntity<?> submitPlan(Authentication authentication, @RequestBody SaveTeamPlanRequest request) {
        AuthGuard.requireSelf(authentication, request.loginId());
        try {
            return ResponseEntity.ok(teamSubmissionService.submitPlan(request));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(StatusResponse.fail(e.getMessage()));
        }
    }

    // ✨ [2026-09-29 추가] 팀 계획서 파일 업로드(원본 첨부 + 양식 자동 추출) / 첨부 삭제
    @PostMapping(value = "/plan/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPlanFile(
            Authentication authentication,
            @RequestParam String loginId,
            @RequestParam Long teamId,
            @RequestParam String submissionId,
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month,
            @RequestParam MultipartFile file
    ) {
        if (authentication == null || !loginId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail("본인 계정으로만 올릴 수 있습니다."));
        }
        try {
            return ResponseEntity.ok(teamSubmissionService.uploadPlanFile(loginId, teamId, submissionId, year, semester, month, file));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
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
            @RequestParam Long teamId,
            @RequestParam String submissionId,
            @RequestParam int year,
            @RequestParam int semester,
            @RequestParam int month
    ) {
        if (authentication == null || !loginId.equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail("본인 계정으로만 수정할 수 있습니다."));
        }
        try {
            return ResponseEntity.ok(teamSubmissionService.removePlanFile(loginId, teamId, submissionId, year, semester, month));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        }
    }

    // ✨ [2026-09-30] 팀 웹 계획서 PDF (커뮤니티에서 내려받기)
    @GetMapping("/plan/pdf")
    public ResponseEntity<byte[]> planPdf(@RequestParam Long submissionId) {
        return teamSubmissionService.planPdf(submissionId);
    }
}
