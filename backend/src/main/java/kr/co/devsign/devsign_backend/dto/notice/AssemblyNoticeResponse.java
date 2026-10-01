package kr.co.devsign.devsign_backend.dto.notice;

import java.util.List;

// ✨ [2026-10-01] 그 달 총회 공지(디스코드 동아리공지 채널)와 신입생·재학생의 반응 현황
public record AssemblyNoticeResponse(
        boolean found,
        String message,          // 못 찾았을 때 안내
        Notice notice,
        List<Group> groups,      // 신입생 / 재학생
        int total,
        int reacted,
        Integer rate,            // 0~100
        List<String> unmatched   // 반응했지만 웹 회원으로 확인 안 된 디스코드 이름
) {
    public record Notice(String messageId, String content, String createdAt, String channelName,
                         String jumpUrl, List<EmojiCount> reactions) {
    }

    public record EmojiCount(String emoji, int count) {
    }

    public record Group(String status, int total, int reacted, Integer rate, List<Person> people) {
    }

    // emojis가 비어 있으면 반응 안 함
    public record Person(String loginId, String name, String studentId, String profileImage, List<String> emojis) {
    }
}
