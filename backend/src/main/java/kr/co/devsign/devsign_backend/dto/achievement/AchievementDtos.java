package kr.co.devsign.devsign_backend.dto.achievement;

import java.util.List;

// ✨ [2026-10-05 신규] 관리자 "실적" 탭 요청·응답
public final class AchievementDtos {
    private AchievementDtos() {
    }

    public record MemberRef(String loginId, String name, String studentId) {
    }

    public record FileDto(Long id, Long entryId, String category, String name, long size,
                          String contentType, boolean image, boolean hasThumb, String uploadedAt) {
    }

    public record EntryDto(Long id, String name, String award, List<MemberRef> members, List<FileDto> files) {
    }

    public record AttendanceDto(Long sessionId, String title, String startedAt, int checked, int total,
                                List<String> attendees) {
    }

    public record AchievementDto(Long id, int year, String type, String title, String startDate, String endDate,
                                 String organizer, String memo, Long hallOfFameId, boolean hallOfFameLinked,
                                 AttendanceDto attendance, List<EntryDto> entries, List<FileDto> files,
                                 List<MemberRef> participants, String sourceUrl, boolean fromDiscord,
                                 String updatedAt) {
    }

    public record SaveRequest(Integer year, String type, String title, String startDate, String endDate,
                              String organizer, String memo, Long attendanceSessionId) {
    }

    public record EntryRequest(String name, String award, List<MemberRef> members) {
    }

    public record SessionOption(Long id, String title, String startedAt, int checked, int total, Long linkedAchievementId) {
    }

    public record YearCount(int year, long count) {
    }

    public record DownloadRequest(String kind, Integer year, Long id) {
    }

    public record ParticipantsRequest(List<MemberRef> members) {
    }

    // 디스코드에서 총회 가져오기 결과 — 새로 만든 달 / 이미 있어서 둔 달 / 아직 안 열린 달 / 공지를 못 찾은 달
    public record DiscordImportResult(int year, List<String> created, List<String> skipped, List<String> upcoming,
                                      List<String> notes) {
    }
}
