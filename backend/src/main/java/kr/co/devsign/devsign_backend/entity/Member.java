package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String loginId;

    @Column(nullable = false)
    private String password;

    private String name;
    private String studentId;
    private String dept;
    private String interests;
    private String discordTag;
    private String userStatus;
    private String role;

    private boolean suspended = false;

    @Column(nullable = false, columnDefinition = "TINYINT(1) DEFAULT 0")
    private boolean deleted = false;

    private LocalDateTime deletedAt;

    @Column(columnDefinition = "LONGTEXT")
    private String profileImage;

    // 로그인 시 발급되는 JWT에 이 값을 그대로 심어두고, 매 요청마다 이 컬럼과 비교한다.
    // 로그아웃 시 이 값을 증가시키면 그 이전에 발급된 토큰은(만료 전이라도) 즉시 무효화된다.
    @Column(nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private long tokenVersion = 0L;
}