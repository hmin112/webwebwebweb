package kr.co.devsign.devsign_backend.dto.chosun;

public record ChosunProgramResponse(
        String title,
        String category,
        String imageUrl,
        String applyUrl,
        String applyPeriod,
        String period
) {
}
