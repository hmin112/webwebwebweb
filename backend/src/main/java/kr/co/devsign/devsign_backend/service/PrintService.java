package kr.co.devsign.devsign_backend.service;

import com.lowagie.text.pdf.PdfReader;
import kr.co.devsign.devsign_backend.dto.print.PrintJobResponse;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.PrintJob;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.repository.PrintJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

// ✨ [2026-10-01 신규] 웹 인쇄 — 업로드 → 미리보기(PDF가 아니면 LibreOffice로 PDF 변환) → 매수 고르고 인쇄 요청(대기열)
// → 프린터 PC의 쿵프린타 봇이 /api/print-agent로 가져가 인쇄 → 결과 보고.
// 원본 파일은 프린터 PC가 받아 그 PC의 한글/파워포인트로 그대로 인쇄하고, 미리보기 PDF는 화면 확인용이다.
@Service
@RequiredArgsConstructor
public class PrintService {

    public static final Set<String> ALLOWED = Set.of("pdf", "ppt", "pptx", "hwp", "hwpx", "doc", "docx");
    public static final long MAX_BYTES = 50L * 1024 * 1024;
    public static final int MAX_COPIES = 10;

    private static final String DRAFT = "DRAFT", QUEUED = "QUEUED", PRINTING = "PRINTING",
            DONE = "DONE", FAILED = "FAILED", CANCELED = "CANCELED";

    private final PrintJobRepository repository;
    private final MemberRepository memberRepository;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadBaseDir;

    // 프린터 PC 봇이 마지막으로 서버에 들른 시각 — 웹에 "프린터 연결됨/꺼짐"으로 보여준다
    private volatile LocalDateTime agentLastSeen;

    // LibreOffice는 동시에 여러 개를 돌리면 프로필 잠금으로 실패해서 한 번에 하나씩 변환한다
    private final Object convertLock = new Object();

    private Path base() {
        return Paths.get(uploadBaseDir).toAbsolutePath().normalize();
    }

    private Path resolve(String rel) {
        Path p = base().resolve(rel).normalize();
        if (!p.startsWith(base())) throw new IllegalArgumentException("잘못된 경로");
        return p;
    }

    // ---------- 부원 ----------

    @Transactional
    public PrintJobResponse upload(String loginId, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("파일을 선택해주세요.");
        if (file.getSize() > MAX_BYTES) throw new IllegalArgumentException("50MB 이하 파일만 인쇄할 수 있어요.");
        String original = Optional.ofNullable(file.getOriginalFilename()).orElse("file");
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (!ALLOWED.contains(ext)) throw new IllegalArgumentException("PDF, PPT/PPTX, HWP/HWPX, DOC/DOCX 파일만 인쇄할 수 있어요.");

        String folder = "print/" + UUID.randomUUID().toString().replace("-", "");
        Path dir = resolve(folder);
        Files.createDirectories(dir);
        Path src = dir.resolve("original." + ext);
        file.transferTo(src.toFile());

        PrintJob job = new PrintJob();
        job.setLoginId(loginId);
        job.setRequesterName(memberRepository.findByLoginId(loginId).map(Member::getName).orElse(loginId));
        job.setOriginalFileName(original.length() > 200 ? original.substring(original.length() - 200) : original);
        job.setExtension(ext);
        job.setStoredPath(folder + "/original." + ext);
        job.setStatus(DRAFT);

        Path pdf = "pdf".equals(ext) ? src : convertToPdf(src, dir);
        if (pdf != null) {
            job.setPreviewPath(base().relativize(pdf).toString());
            job.setPageCount(countPages(pdf));
        } else {
            job.setErrorMessage("미리보기를 만들지 못했어요. 인쇄는 그대로 할 수 있어요.");
        }
        return toResponse(repository.save(job));
    }

    private Path convertToPdf(Path src, Path dir) {
        synchronized (convertLock) {
            try {
                Process p = new ProcessBuilder("soffice", "--headless", "--norestore",
                        "-env:UserInstallation=file:///tmp/lo-print-profile",
                        "--convert-to", "pdf", "--outdir", dir.toString(), src.toString())
                        .redirectErrorStream(true)
                        .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                        .start();
                if (!p.waitFor(90, TimeUnit.SECONDS)) {
                    p.destroyForcibly();
                    return null;
                }
                Path out = dir.resolve("original.pdf");
                if (!Files.exists(out)) return null;
                Path preview = dir.resolve("preview.pdf");
                Files.move(out, preview, StandardCopyOption.REPLACE_EXISTING);
                return preview;
            } catch (Exception e) {
                System.err.println("인쇄 미리보기 변환 실패: " + e.getMessage());
                return null;
            }
        }
    }

    private Integer countPages(Path pdf) {
        try {
            PdfReader reader = new PdfReader(pdf.toString());
            try {
                return reader.getNumberOfPages();
            } finally {
                reader.close();
            }
        } catch (Exception e) {
            return null;
        }
    }

    public byte[] preview(Long id, String loginId, boolean admin) throws IOException {
        PrintJob job = own(id, loginId, admin);
        if (job.getPreviewPath() == null) throw new IllegalArgumentException("미리보기가 없어요.");
        return Files.readAllBytes(resolve(job.getPreviewPath()));
    }

    @Transactional
    public PrintJobResponse submit(Long id, String loginId, int copies) {
        PrintJob job = own(id, loginId, false);
        if (!DRAFT.equals(job.getStatus())) throw new IllegalArgumentException("이미 인쇄를 요청했거나 끝난 작업이에요.");
        if (copies < 1 || copies > MAX_COPIES) throw new IllegalArgumentException("인쇄 매수는 1~" + MAX_COPIES + "장이에요.");
        job.setCopies(copies);
        job.setStatus(QUEUED);
        job.setQueuedAt(LocalDateTime.now());
        return toResponse(repository.save(job));
    }

    @Transactional
    public PrintJobResponse cancel(Long id, String loginId, boolean admin) {
        PrintJob job = own(id, loginId, admin);
        if (!DRAFT.equals(job.getStatus()) && !QUEUED.equals(job.getStatus())) {
            throw new IllegalArgumentException("이미 프린터로 넘어간 작업은 취소할 수 없어요.");
        }
        job.setStatus(CANCELED);
        job.setFinishedAt(LocalDateTime.now());
        deleteFiles(job);
        return toResponse(repository.save(job));
    }

    public List<PrintJobResponse> mine(String loginId) {
        return repository.findTop10ByLoginIdAndStatusNotOrderByIdDesc(loginId, DRAFT).stream().map(this::toResponse).toList();
    }

    public Map<String, Object> status() {
        LocalDateTime seen = agentLastSeen;
        boolean online = seen != null && seen.isAfter(LocalDateTime.now().minusSeconds(40));
        return Map.of("online", online, "queued", repository.countByStatus(QUEUED),
                "lastSeen", seen == null ? "" : seen.toString());
    }

    private PrintJob own(Long id, String loginId, boolean admin) {
        PrintJob job = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("인쇄 작업을 찾을 수 없어요."));
        if (!admin && !job.getLoginId().equals(loginId)) throw new IllegalStateException("본인 인쇄 작업만 볼 수 있어요.");
        return job;
    }

    private PrintJobResponse toResponse(PrintJob j) {
        long pos = QUEUED.equals(j.getStatus()) ? repository.countByStatusAndIdLessThan(QUEUED, j.getId()) : 0;
        return PrintJobResponse.of(j, pos);
    }

    // ---------- 프린터 PC 봇 ----------

    // 가장 오래 기다린 작업 하나를 꺼내 PRINTING으로 — 두 번 가져가지 않게 한 번에 하나씩
    @Transactional
    public synchronized Optional<Map<String, Object>> claim() {
        agentLastSeen = LocalDateTime.now();
        return repository.findFirstByStatusOrderByQueuedAtAscIdAsc(QUEUED).map(job -> {
            job.setStatus(PRINTING);
            job.setClaimedAt(LocalDateTime.now());
            repository.save(job);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", job.getId());
            m.put("fileName", job.getOriginalFileName());
            m.put("extension", job.getExtension());
            m.put("copies", job.getCopies());
            m.put("requester", job.getRequesterName());
            return m;
        });
    }

    public byte[] agentFile(Long id) throws IOException {
        PrintJob job = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("작업이 없어요."));
        if (!PRINTING.equals(job.getStatus())) throw new IllegalArgumentException("인쇄 중인 작업이 아니에요.");
        return Files.readAllBytes(resolve(job.getStoredPath()));
    }

    @Transactional
    public void agentResult(Long id, boolean success, String message) {
        agentLastSeen = LocalDateTime.now();
        PrintJob job = repository.findById(id).orElseThrow(() -> new IllegalArgumentException("작업이 없어요."));
        if (!PRINTING.equals(job.getStatus())) return;
        job.setStatus(success ? DONE : FAILED);
        job.setErrorMessage(success ? null : (message == null ? "인쇄 실패" : message.length() > 480 ? message.substring(0, 480) : message));
        job.setFinishedAt(LocalDateTime.now());
        repository.save(job);
        deleteFiles(job);
    }

    // ---------- 정리 ----------

    // 프린터 PC가 가져가고 15분 넘게 결과를 안 주면 실패 처리, 오래된 작업 파일은 지운다 (10분마다)
    @Scheduled(fixedDelay = 10 * 60 * 1000, initialDelay = 2 * 60 * 1000)
    @Transactional
    public void housekeeping() {
        LocalDateTime now = LocalDateTime.now();
        for (PrintJob j : repository.findByStatusAndClaimedAtBefore(PRINTING, now.minusMinutes(15))) {
            j.setStatus(FAILED);
            j.setErrorMessage("프린터 PC에서 응답이 없어요. 다시 요청해주세요.");
            j.setFinishedAt(now);
            repository.save(j);
            deleteFiles(j);
        }
        for (PrintJob j : repository.findByStatusInAndCreatedAtBefore(List.of(DRAFT), now.minusHours(6))) {
            j.setStatus(CANCELED);
            j.setFinishedAt(now);
            repository.save(j);
            deleteFiles(j);
        }
    }

    private void deleteFiles(PrintJob job) {
        try {
            if (job.getStoredPath() == null) return;
            Path dir = resolve(job.getStoredPath()).getParent();
            if (dir == null || !dir.startsWith(base().resolve("print"))) return;
            try (var files = Files.list(dir)) {
                for (Path f : files.toList()) Files.deleteIfExists(f);
            }
            Files.deleteIfExists(dir);
        } catch (Exception e) {
            System.err.println("인쇄 파일 정리 실패: " + e.getMessage());
        }
    }
}
