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
}
