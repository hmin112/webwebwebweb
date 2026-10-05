package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 실적 파일 — 실적 전체에 붙거나(entryId 없음) 참가 팀/개인에 붙는다.
// category: CERTIFICATE(상장) / PLAN(기획서) / RESULT(결과물) / PHOTO(사진) / ETC(기타)
// 파일은 공개 서빙되지 않는 별도 볼륨(app.achievement.base-dir)에 둔다.
@Entity
@Table(name = "achievement_file")
@Getter @Setter
public class AchievementFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long achievementId;
    private Long entryId;

    private String category;
    private String originalName;
    private String storedPath;
    private String thumbPath;
    private long size;
    private String contentType;

    private String uploadedBy;
    private LocalDateTime uploadedAt = LocalDateTime.now();
}
