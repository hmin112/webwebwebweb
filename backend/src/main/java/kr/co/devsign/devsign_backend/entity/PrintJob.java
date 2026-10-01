package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// ✨ [2026-10-01 신규] 웹 인쇄 작업 — 부원이 웹에서 파일을 올리고 인쇄를 누르면 대기열에 들어가고,
// 프린터 PC의 쿵프린타 봇이 서버에서 가져가 인쇄한 뒤 결과를 알려준다.
// 상태: DRAFT(올리고 미리보기 중) → QUEUED(인쇄 대기) → PRINTING(프린터 PC가 가져감) → DONE / FAILED, 또는 CANCELED
@Entity
@Getter @Setter
public class PrintJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String loginId;
    private String requesterName;

    private String originalFileName;
    private String extension;

    // 업로드 폴더 기준 상대 경로 (원본 / 미리보기 PDF)
    private String storedPath;
    private String previewPath;

    private Integer pageCount;
    private int copies = 1;

    private String status;

    @Column(length = 500)
    private String errorMessage;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime queuedAt;
    private LocalDateTime claimedAt;
    private LocalDateTime finishedAt;
}
