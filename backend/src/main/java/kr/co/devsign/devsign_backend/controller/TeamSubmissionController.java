package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import kr.co.devsign.devsign_backend.dto.team.SaveTeamPlanRequest;
import kr.co.devsign.devsign_backend.dto.team.SubmitTeamFilesCommand;
import kr.co.devsign.devsign_backend.dto.team.TeamSubmissionResponse;
import kr.co.devsign.devsign_backend.service.TeamSubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> savePlanDraft(@RequestBody SaveTeamPlanRequest request) {
        try {
            return ResponseEntity.ok(teamSubmissionService.savePlanDraft(request));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        }
    }

    @PostMapping("/plan/submit")
    public ResponseEntity<?> submitPlan(@RequestBody SaveTeamPlanRequest request) {
        try {
            return ResponseEntity.ok(teamSubmissionService.submitPlan(request));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(StatusResponse.fail(e.getMessage()));
        }
    }
}
