package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.service.AssemblyService;
import kr.co.devsign.devsign_backend.dto.assembly.MySubmissionsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesCommand;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesResponse;
import kr.co.devsign.devsign_backend.dto.common.StatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/assembly")
@RequiredArgsConstructor
public class AssemblyController {

    private final AssemblyService assemblyService;

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
    public ResponseEntity<StatusResponse> saveProjectTitle(@RequestBody SaveProjectTitleRequest params) {
        assemblyService.saveProjectTitle(params);
        return ResponseEntity.ok(StatusResponse.success());
    }

    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubmitFilesResponse> submitFiles(
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
}
