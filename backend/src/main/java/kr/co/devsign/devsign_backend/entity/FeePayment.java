package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// ✨ [2026-09-09 신규] 월별 회비 납부 체크 — 행이 있으면 "납부함", 해제하면 행을 지운다.
@Entity
@Getter @Setter
@Table(name = "fee_payment", uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month", "login_id"}))
public class FeePayment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private int month;

    @Column(name = "login_id", nullable = false)
    private String loginId;

    private LocalDateTime paidAt;
}
