package kr.co.devsign.devsign_backend.dto.print;

import kr.co.devsign.devsign_backend.entity.PrintJob;

public record PrintJobResponse(
        Long id,
        String fileName,
        String extension,
        Integer pageCount,
        int copies,
        String status,
        String errorMessage,
        String createdAt,
        String queuedAt,
        String finishedAt,
        long queuePosition,   // QUEUED일 때 앞에 기다리는 작업 수
        boolean previewReady,
        String formKey
) {
    public static PrintJobResponse of(PrintJob j, long queuePosition) {
        return new PrintJobResponse(j.getId(), j.getOriginalFileName(), j.getExtension(), j.getPageCount(), j.getCopies(),
                j.getStatus(), j.getErrorMessage(),
                j.getCreatedAt() == null ? null : j.getCreatedAt().toString(),
                j.getQueuedAt() == null ? null : j.getQueuedAt().toString(),
                j.getFinishedAt() == null ? null : j.getFinishedAt().toString(),
                queuePosition, j.getPreviewPath() != null, j.getFormKey());
    }
}
