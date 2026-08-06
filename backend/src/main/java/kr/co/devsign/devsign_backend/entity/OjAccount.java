package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class OjAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "member_id", unique = true, nullable = false)
    private Member member;

    @Column(nullable = false)
    private Long ojUserId;

    @Column(nullable = false)
    private String ojUsername;

    // OJ의 open_api appkey는 그 계정을 그대로 사용할 수 있는 자격증명이라 평문 저장하지 않는다.
    @Column(nullable = false, columnDefinition = "TEXT")
    private String ojAppkeyEncrypted;

    private LocalDateTime createdAt;
}
