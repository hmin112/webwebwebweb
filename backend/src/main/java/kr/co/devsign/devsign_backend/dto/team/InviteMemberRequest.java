package kr.co.devsign.devsign_backend.dto.team;

public record InviteMemberRequest(
        String requesterLoginId,
        String targetLoginId
) {
}
