package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// ✨ [2026-10-05 신규] 동아리 실적 — 해마다 대회·총회·교육·행사를 그때그때 올려 두고, 연말에 압축 파일 하나로 내려받는다.
// 대회는 참가 팀/개인(entries)마다 상과 파일(상장·기획서·결과물·사진)을 따로 갖고,
// 총회·교육은 출석 기록(AttendanceSession)을 연결해 출석부가 함께 나간다.
// 명예의 전당 글은 같은 해 실적 탭을 열 때 대회로 자동으로 들어온다(hallOfFameId). 들어온 뒤에는 따로 고칠 수 있다.
@Entity
@Table(name = "achievement")
@Getter @Setter
public class Achievement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "achievement_year")
    private int year;

    // COMPETITION(대회) / ASSEMBLY(총회) / EDUCATION(교육) / EVENT(행사)
    private String type;

    private String title;
    private LocalDate startDate;
    private LocalDate endDate;

    // 주최·주관 (대회)
    private String organizer;

    @Column(columnDefinition = "TEXT")
    private String memo;

    private Long attendanceSessionId;
    private Long hallOfFameId;

    // 디스코드 총회 공지에서 가져온 실적 — "discord-assembly:2026-04" 같은 키로 이미 가져온 달을 알아본다
    private String sourceKey;
    private String sourceUrl;
    private String discordMessageId;

    // 명예의 전당에서 온 실적을 지우면 행은 남겨 두고 숨긴다 — 그래야 다음에 탭을 열 때 다시 들어오지 않는다
    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();

    // 총회·교육·행사의 참석 인원 (디스코드 반응에서 가져오거나 직접 넣는다)
    @ElementCollection
    @CollectionTable(name = "achievement_participants", joinColumns = @JoinColumn(name = "achievement_id"))
    @OrderColumn(name = "member_order")
    private List<AchievementMember> participants = new ArrayList<>();

    @OneToMany(mappedBy = "achievement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    private List<AchievementEntry> entries = new ArrayList<>();
}
