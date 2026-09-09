package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

// ✨ [2026-09-09 신규] 월별 회비 금액 설정 — 신입생/재학생 금액을 따로 둔다.
@Entity
@Getter @Setter
@Table(name = "fee_setting", uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month"}))
public class FeeSetting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private int month;

    private int freshmanAmount;
    private int attendingAmount;
}
