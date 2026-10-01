package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.notice.AssemblyNoticeResponse;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.regex.Pattern;

// ✨ [2026-10-01 신규] 디스코드 "동아리공지" 채널에서 그 달 총회 공지를 자동으로 찾아, 신입생·재학생 중
// 누가 반응했는지(참석 투표) 보여준다. 출석 시작도 이 공지를 그대로 쓴다(관리자가 메시지 ID를 찾아 넣지 않아도 됨).
// 찾는 규칙: 그 달 1일 50일 전 ~ 그 달 말일에 올라온 메시지 중 "N월 총회"가 들어간 것, 그중 반응이 가장 많은 것.
@Service
@RequiredArgsConstructor
public class AssemblyNoticeService {

    private static final String CHANNEL = "동아리공지";
    private static final List<String> TARGET_STATUSES = List.of("신입생", "재학생");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final DiscordBotClient discordBotClient;
    private final MemberRepository memberRepository;

    public record FoundNotice(String messageId, String content, String createdAt, String channelName, String jumpUrl,
                              List<AssemblyNoticeResponse.EmojiCount> reactions) {
    }

    @SuppressWarnings("unchecked")
    public Optional<FoundNotice> findNotice(int year, int month) {
        Map<String, Object> res = discordBotClient.getChannelMessages(CHANNEL, 300);
        if (res == null || !"success".equals(String.valueOf(res.get("status")))) {
            throw new IllegalStateException(res != null && res.get("message") != null
                    ? res.get("message").toString() : "디스코드 공지 채널을 읽지 못했습니다.");
        }
        Pattern title = Pattern.compile("(?<!\\d)" + month + "\\s*월\\s*(정기\\s*)?총회");
        LocalDate from = LocalDate.of(year, month, 1).minusDays(50);
        LocalDate to = LocalDate.of(year, month, 1).plusMonths(1).minusDays(1);
        String guildId = String.valueOf(res.get("guildId"));
        String channelId = String.valueOf(res.get("channelId"));

        Map<String, Object> best = null;
        int bestCount = -1;
        for (Map<String, Object> m : (List<Map<String, Object>>) res.getOrDefault("messages", List.of())) {
            String content = String.valueOf(m.getOrDefault("content", ""));
            if (!title.matcher(content).find()) continue;
            LocalDate created = OffsetDateTime.parse(String.valueOf(m.get("createdAt"))).atZoneSameInstant(KST).toLocalDate();
            if (created.isBefore(from) || created.isAfter(to)) continue;
            int count = ((List<Map<String, Object>>) m.getOrDefault("reactions", List.of())).stream()
                    .mapToInt(r -> r.get("count") instanceof Number n ? n.intValue() : 0).sum();
            // 반응이 더 많은 것, 같으면 더 최근 것(목록이 최신순이라 먼저 본 것)을 유지
            if (count > bestCount) {
                best = m;
                bestCount = count;
            }
        }
        if (best == null) return Optional.empty();
        String id = String.valueOf(best.get("id"));
        List<AssemblyNoticeResponse.EmojiCount> reactions = ((List<Map<String, Object>>) best.getOrDefault("reactions", List.of())).stream()
                .map(r -> new AssemblyNoticeResponse.EmojiCount(String.valueOf(r.get("emoji")),
                        r.get("count") instanceof Number n ? n.intValue() : 0))
                .toList();
        return Optional.of(new FoundNotice(id, String.valueOf(best.get("content")), String.valueOf(best.get("createdAt")),
                String.valueOf(res.get("channelName")),
                "https://discord.com/channels/" + guildId + "/" + channelId + "/" + id, reactions));
    }

    @SuppressWarnings("unchecked")
    public AssemblyNoticeResponse reactions(int year, int month) {
        Optional<FoundNotice> found = findNotice(year, month);
        if (found.isEmpty()) {
            return new AssemblyNoticeResponse(false, month + "월 총회 공지를 동아리공지 채널에서 찾지 못했어요.",
                    null, List.of(), 0, 0, null, List.of());
        }
        FoundNotice n = found.get();
        Map<String, Object> res = discordBotClient.getAllReactors(n.messageId());
        List<Map<String, Object>> reactors = res == null ? List.of()
                : (List<Map<String, Object>>) res.getOrDefault("members", List.of());

        // 디스코드 이름(소문자) → 누른 이모지들
        Map<String, List<String>> emojisByTag = new HashMap<>();
        for (Map<String, Object> r : reactors) {
            Object tag = r.get("discordTag");
            if (tag == null) continue;
            emojisByTag.put(tag.toString().toLowerCase(Locale.ROOT), (List<String>) r.getOrDefault("emojis", List.of()));
        }

        List<Member> members = memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .filter(m -> !m.isDeparted() && TARGET_STATUSES.contains(m.getUserStatus()))
                .toList();
        Set<String> matchedTags = new HashSet<>();
        List<AssemblyNoticeResponse.Group> groups = new ArrayList<>();
        int total = 0, reacted = 0;
        for (String status : TARGET_STATUSES) {
            List<AssemblyNoticeResponse.Person> people = new ArrayList<>();
            int g = 0, gr = 0;
            for (Member m : members) {
                if (!status.equals(m.getUserStatus())) continue;
                String tag = m.getDiscordTag() == null ? null : m.getDiscordTag().toLowerCase(Locale.ROOT);
                List<String> emojis = tag == null ? List.of() : emojisByTag.getOrDefault(tag, List.of());
                if (tag != null && emojisByTag.containsKey(tag)) matchedTags.add(tag);
                people.add(new AssemblyNoticeResponse.Person(m.getLoginId(), m.getName(), m.getStudentId(), m.getProfileImage(), emojis));
                g++;
                if (!emojis.isEmpty()) gr++;
            }
            groups.add(new AssemblyNoticeResponse.Group(status, g, gr, g == 0 ? null : (int) Math.round(gr * 100.0 / g), people));
            total += g;
            reacted += gr;
        }
        // 반응했는데 신입생·재학생 회원으로 안 잡힌 사람(4학년·졸업생·미가입 등)은 이름만
        Set<String> memberTags = new HashSet<>();
        memberRepository.findByDeletedFalseOrderByStudentIdDesc().forEach(m -> {
            if (m.getDiscordTag() != null) memberTags.add(m.getDiscordTag().toLowerCase(Locale.ROOT));
        });
        List<String> unmatched = reactors.stream()
                .filter(r -> r.get("discordTag") != null && !memberTags.contains(r.get("discordTag").toString().toLowerCase(Locale.ROOT)))
                .map(r -> String.valueOf(r.getOrDefault("name", r.get("discordTag"))))
                .toList();

        return new AssemblyNoticeResponse(true, null,
                new AssemblyNoticeResponse.Notice(n.messageId(), n.content(), n.createdAt(), n.channelName(), n.jumpUrl(), n.reactions()),
                groups, total, reacted, total == 0 ? null : (int) Math.round(reacted * 100.0 / total), unmatched);
    }
}
