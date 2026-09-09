package kr.co.devsign.devsign_backend.dto.fee;

public record SaveFeeSettingRequest(
        Integer freshmanAmount,
        Integer attendingAmount
) {
}
