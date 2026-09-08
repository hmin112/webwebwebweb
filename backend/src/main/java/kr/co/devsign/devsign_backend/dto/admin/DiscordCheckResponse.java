package kr.co.devsign.devsign_backend.dto.admin;

import java.util.List;
import java.util.Map;

// ✨ [2026-09-08 추가] 기존 "디스코드 확인" 응답(웹 회원 목록 + 잔류 여부)에, 디스코드에는 있지만
// 웹사이트에는 아직 가입하지 않은 사람(재학생/휴학생만 대상)까지 함께 내려준다.
public record DiscordCheckResponse(
        List<AdminDiscordCheckResponse> members,
        Map<String, List<UnregisteredGuildMemberResponse>> unregistered // "재학생" -> [...], "휴학생" -> [...] 순서
) {
    public record UnregisteredGuildMemberResponse(String nickname, String discordTag) {}
}
