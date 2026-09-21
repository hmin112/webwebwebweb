package kr.co.devsign.devsign_backend.dto.team;

import java.util.List;

// ✨ [2026-09-21 수정] 한 명이 한 학기에 여러 팀에 속할 수 있게 되면서 단일 team -> teams 목록으로 변경
public record MyTeamStatusResponse(
        List<TeamResponse> teams,
        List<TeamInvitationResponse> pendingInvitations
) {
}
