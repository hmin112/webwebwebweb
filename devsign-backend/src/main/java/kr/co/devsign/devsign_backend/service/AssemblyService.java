package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.SubmissionPeriodResponse;
import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import kr.co.devsign.devsign_backend.entity.AssemblyProject;
import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import kr.co.devsign.devsign_backend.repository.AssemblyPeriodRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyProjectRepository;
import kr.co.devsign.devsign_backend.repository.AssemblyReportRepository;
import kr.co.devsign.devsign_backend.dto.assembly.AssemblyReportResponse;
import kr.co.devsign.devsign_backend.dto.assembly.MySubmissionsResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveProjectTitleRequest;
import kr.co.devsign.devsign_backend.dto.assembly.SubmitFilesCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssemblyService {

    private static final int[] ACTIVE_MONTHS = new int[]{3, 4, 5, 6, 9, 10, 11, 12};

    private final AssemblyPeriodRepository periodRepository;
    private final AssemblyReportRepository reportRepository;
    private final AssemblyProjectRepository projectRepository;
    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    public List<SubmissionPeriodResponse> getSubmissionPeriods(int year) {
        List<AssemblyPeriod> savedPeriods = periodRepository.findByYearOrderByMonthAsc(year);
        Map<Integer, AssemblyPeriod> periodByMonth = savedPeriods.stream()
                .collect(java.util.stream.Collectors.toMap(AssemblyPeriod::getMonth, p -> p, (a, b) -> a));

        return Arrays.stream(ACTIVE_MONTHS)
                .mapToObj(month -> {
                    int semester = month <= 6 ? 1 : 2;
                    AssemblyPeriod period = periodByMonth.get(month);

                    String type = period != null && StringUtils.hasText(period.getType())
                            ? period.getType()
                            : resolveType(month);
                    LocalDate startDate = period != null && period.getStartDate() != null
                            ? period.getStartDate()
                            : LocalDate.of(year, month, 1);
                    LocalDate endDate = period != null && period.getEndDate() != null
                            ? period.getEndDate()
                            : LocalDate.of(year, month, 28);

                    return new SubmissionPeriodResponse(
                            period != null ? period.getId() : null,
                            month,
                            year,
                            semester,
                            type,
                            startDate.toString(),
                            endDate.toString()
                    );
                })
                .toList();
    }

    public MySubmissionsResponse getMySubmissions(String loginId, int year, int semester) {
        List<AssemblyReport> reports =
                reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);

        if (reports.isEmpty()) {
            int[] months = (semester == 1) ? new int[]{3, 4, 5, 6} : new int[]{9, 10, 11, 12};
            for (int month : months) {
                AssemblyReport r = new AssemblyReport();
                r.setLoginId(loginId);
                r.setYear(year);
                r.setSemester(semester);
                r.setMonth(month);
                r.setStatus("NOT_SUBMITTED");
                r.setType(resolveType(month));
                reportRepository.save(r);
            }
            reports = reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);
        }

        String projectTitle = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .map(AssemblyProject::getTitle)
                .orElse("");

        List<AssemblyReportResponse> reportResponses = reports.stream()
                .map(this::toReportResponse)
                .toList();

        return new MySubmissionsResponse(reportResponses, projectTitle);
    }

    public void saveProjectTitle(SaveProjectTitleRequest params) {
        String loginId = params.loginId();
        int year = params.year();
        int semester = params.semester();
        String title = params.title();

        AssemblyProject project = projectRepository.findByLoginIdAndYearAndSemester(loginId, year, semester)
                .orElse(new AssemblyProject());

        project.setLoginId(loginId);
        project.setYear(year);
        project.setSemester(semester);
        project.setTitle(title);

        projectRepository.save(project);
    }

    public String submitFiles(SubmitFilesCommand command) throws Exception {
        String loginId = command.loginId();
        String reportId = command.reportId();
        int year = command.year();
        int semester = command.semester();
        int month = command.month();
        String memo = command.memo();
        MultipartFile presentation = command.presentation();
        MultipartFile pdf = command.pdf();
        MultipartFile other = command.other();

        AssemblyReport report = null;

        if (reportId != null && !reportId.equals("0") && !reportId.startsWith("temp")) {
            report = reportRepository.findById(Long.parseLong(reportId)).orElse(null);
        }

        if (report == null) {
            List<AssemblyReport> existing =
                    reportRepository.findByLoginIdAndYearAndSemesterOrderByMonthAsc(loginId, year, semester);

            report = existing.stream()
                    .filter(r -> r.getMonth() == month)
                    .findFirst()
                    .orElse(null);
        }

        if (report == null) {
            report = new AssemblyReport();
            report.setLoginId(loginId);
            report.setYear(year);
            report.setSemester(semester);
            report.setMonth(month);
            report.setStatus("NOT_SUBMITTED");
            report.setType(resolveType(month));
        }

        validateUploadFiles(presentation, pdf, other, report);

        Path uploadBasePath = getUploadBasePath();
        Path userPath = uploadBasePath.resolve(loginId).resolve(String.valueOf(month)).normalize();
        validateWithinBase(userPath, uploadBasePath);
        Files.createDirectories(userPath);

        if (presentation != null && !presentation.isEmpty()) {
            String fileName = buildStorageFileName("pres_", presentation);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            presentation.transferTo(targetPath.toFile());
            report.setPresentationPath(toStoredPath(uploadBasePath, targetPath));
        }

        if (pdf != null && !pdf.isEmpty()) {
            String fileName = buildStorageFileName("pdf_", pdf);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            pdf.transferTo(targetPath.toFile());
            report.setPdfPath(toStoredPath(uploadBasePath, targetPath));
        }

        if (other != null && !other.isEmpty()) {
            String fileName = buildStorageFileName("other_", other);
            Path targetPath = userPath.resolve(fileName).normalize();
            validateWithinBase(targetPath, uploadBasePath);
            other.transferTo(targetPath.toFile());
            report.setOtherPath(toStoredPath(uploadBasePath, targetPath));
        }

        report.setMemo(memo);
        report.setStatus("SUBMITTED");
        report.setDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd")));

        reportRepository.save(report);
        return "submitted";
    }

    public ResponseEntity<byte[]> downloadFile(String path) {
        try {
            if (!StringUtils.hasText(path)) {
                return ResponseEntity.badRequest().body(new byte[0]);
            }

            Path uploadBasePath = getUploadBasePath();
            Path resolvedPath = resolveUploadPath(path, uploadBasePath);

            if (resolvedPath == null || !isAllowedUploadPath(resolvedPath, uploadBasePath)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new byte[0]);
            }

            if (!Files.exists(resolvedPath) || !Files.isRegularFile(resolvedPath)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new byte[0]);
            }

            byte[] data = Files.readAllBytes(resolvedPath);
            String fileName = resolvedPath.getFileName().toString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition.attachment()
                    .filename(fileName, StandardCharsets.UTF_8)
                    .build());

            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new byte[0]);
        }
    }

    private void validateUploadFiles(
            MultipartFile presentation,
            MultipartFile pdf,
            MultipartFile other,
            AssemblyReport report
    ) {
        validateExtension(
                presentation,
                Set.of("ppt", "pptx"),
                "발표자료는 .ppt 또는 .pptx 파일만 업로드할 수 있습니다."
        );
        validateExtension(
                pdf,
                Set.of("pdf"),
                "PDF 항목에는 .pdf 파일만 업로드할 수 있습니다."
        );

        boolean hasNewFile = hasUpload(presentation) || hasUpload(pdf) || hasUpload(other);
        boolean hasExistingFile = hasAnyExistingFile(report);

        if (!hasNewFile && !hasExistingFile) {
            throw new IllegalArgumentException("발표자료, PDF, 기타자료 중 하나 이상 업로드해야 합니다.");
        }
    }

    private boolean hasUpload(MultipartFile file) {
        return file != null && !file.isEmpty();
    }

    private boolean hasAnyExistingFile(AssemblyReport report) {
        return StringUtils.hasText(report.getPresentationPath())
                || StringUtils.hasText(report.getPdfPath())
                || StringUtils.hasText(report.getOtherPath());
    }

    private void validateExtension(MultipartFile file, Set<String> allowedExtensions, String message) {
        if (!hasUpload(file)) {
            return;
        }

        String originalFilename = file.getOriginalFilename();
        if (!StringUtils.hasText(originalFilename)) {
            throw new IllegalArgumentException(message);
        }

        int lastDot = originalFilename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == originalFilename.length() - 1) {
            throw new IllegalArgumentException(message);
        }

        String extension = originalFilename.substring(lastDot + 1).toLowerCase();
        if (!allowedExtensions.contains(extension)) {
            throw new IllegalArgumentException(message);
        }
    }

    private String resolveType(int month) {
        if (month == 3 || month == 9) {
            return "PLAN";
        }
        if (month == 6 || month == 12) {
            return "RESULT";
        }
        return "PROGRESS";
    }

    private AssemblyReportResponse toReportResponse(AssemblyReport report) {
        return new AssemblyReportResponse(
                report.getId(),
                report.getLoginId(),
                report.getYear(),
                report.getSemester(),
                report.getMonth(),
                report.getType(),
                report.getStatus(),
                report.getTitle(),
                report.getMemo(),
                report.getDate(),
                report.getDeadline(),
                report.getPresentationPath(),
                report.getPdfPath(),
                report.getOtherPath()
        );
    }

    private Path getUploadBasePath() {
        Path configured = Paths.get(uploadBaseDir);
        if (!configured.isAbsolute()) {
            configured = Paths.get(System.getProperty("user.dir")).resolve(configured);
        }
        return configured.toAbsolutePath().normalize();
    }

    private String buildStorageFileName(String prefix, MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        String fileName = Paths.get(original).getFileName().toString();
        if (!StringUtils.hasText(fileName)) {
            fileName = "file";
        }
        return prefix + fileName;
    }

    private String toStoredPath(Path uploadBasePath, Path targetPath) {
        return uploadBasePath.relativize(targetPath).toString().replace(File.separatorChar, '/');
    }

    private void validateWithinBase(Path targetPath, Path basePath) {
        if (!targetPath.startsWith(basePath)) {
            throw new IllegalArgumentException("invalid upload path");
        }
    }

    private Path resolveUploadPath(String rawPath, Path uploadBasePath) {
        String normalized = rawPath.replace("\\", "/").trim();
        if (!StringUtils.hasText(normalized)) {
            return null;
        }

        if (normalized.startsWith("/uploads/") || normalized.startsWith("uploads/")) {
            String relative = normalized.replaceFirst("^/?uploads/", "");
            return uploadBasePath.resolve(relative).normalize();
        }

        Path requested = Paths.get(rawPath);
        if (requested.isAbsolute()) {
            return requested.toAbsolutePath().normalize();
        }

        return uploadBasePath.resolve(requested).normalize();
    }

    private boolean isAllowedUploadPath(Path resolvedPath, Path uploadBasePath) {
        if (resolvedPath.startsWith(uploadBasePath)) {
            return true;
        }

        Path currentUploadsBase = Paths.get(System.getProperty("user.dir"), "uploads").toAbsolutePath().normalize();
        if (resolvedPath.startsWith(currentUploadsBase)) {
            return true;
        }

        Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath().normalize();
        if (userDir.getParent() != null) {
            Path parentUploadsBase = userDir.getParent().resolve("uploads").toAbsolutePath().normalize();
            return resolvedPath.startsWith(parentUploadsBase);
        }

        return false;
    }
}
