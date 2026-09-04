package kr.co.devsign.devsign_backend.dto.board;

public record FeeLedgerItemDto(
        String type,
        String date,
        String description,
        long amount
) {
}
