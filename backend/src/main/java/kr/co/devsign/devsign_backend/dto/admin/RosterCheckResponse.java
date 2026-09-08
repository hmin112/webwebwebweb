package kr.co.devsign.devsign_backend.dto.admin;

import java.util.List;
import java.util.Map;

// ✨ [2026-09-08 신규] 엑셀 명단(부원 명부)과 실제 디스코드 서버 멤버를 대조하는 "명단 대조" 기능의 응답.
// 디스코드 서버 상태를 기준(source of truth)으로 삼아, 엑셀 쪽에서 고쳐야 할 부분을 찾아준다.
public record RosterCheckResponse(
        Map<String, List<DiscordOnlyEntry>> discordNotInFile, // 디스코드엔 있는데 파일엔 없음 (userStatus별로 묶음)
        Map<String, List<FileOnlyEntry>> fileNotInDiscord,     // 파일엔 있는데 디스코드에서 매칭 안 됨 (파일 상태값별로 묶음)
        List<IdChangedEntry> idChanged,                        // 닉네임은 매칭되는데 디스코드 아이디(계정명)가 파일과 다름
        List<StatusMismatchEntry> statusMismatch,              // 닉네임은 매칭되는데 파일 상태에 대응하는 디스코드 역할이 없음
        List<UnmatchedRowEntry> unmatchedRows,                 // 학번/이름 형식을 해석할 수 없는 행
        int totalDiscordMembers,
        int totalFileRows
) {
    public record DiscordOnlyEntry(String nickname, String discordTag) {}

    public record FileOnlyEntry(String name, String studentId, String expectedNickname) {}

    public record IdChangedEntry(String name, String studentId, String fileId, String currentDiscordId, String nickname) {}

    public record StatusMismatchEntry(String name, String studentId, String fileStatus, String expectedStatus, String currentDiscordStatus) {}

    public record UnmatchedRowEntry(String name, String studentId, String reason) {}
}
