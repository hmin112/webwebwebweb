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
public class VerificationGrant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String purpose;

    @Column(nullable = false, length = 64)
    private String subject;

    @Column(nullable = false, unique = true, length = 128)
    private String tokenHash;

    private String nameSnapshot;
    private String studentIdSnapshot;
    private String roleSnapshot;
    private String userStatusSnapshot;
    private String avatarUrlSnapshot;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime usedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
