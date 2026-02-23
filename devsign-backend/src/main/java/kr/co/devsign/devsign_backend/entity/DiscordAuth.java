package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
public class DiscordAuth {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String discordTag;
    private String code;
    private LocalDateTime expiry;

    // ✨ 추가해야 할 필드들 (이게 없어서 getRole, getDiscordNickname 등에서 에러 발생)
    private String discordNickname; // "22 김형민" 형태 저장용
    private String role;            // ADMIN 또는 USER
    private String userStatus;      // 재학생, 휴학생 등

    @Column(columnDefinition = "LONGTEXT")
    private String avatarUrl;       // 디스코드 프로필 이미지 주소
}