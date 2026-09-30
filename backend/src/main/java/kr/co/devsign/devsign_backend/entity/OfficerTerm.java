package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// ✨ [2026-09-30 신규] 역대 임원진(회장·부회장·총무) — 동아리 소개 "연대기"에 연도별로 보인다.
// 올해 것은 부원 이름의 "(회장)" 같은 표시로 매일 자동 기록(manual=false), 지난 해는 관리자가 입력(manual=true).
@Entity
@Table(name = "officer_term", uniqueConstraints = @UniqueConstraint(columnNames = {"term_year", "role"}))
@Getter @Setter
public class OfficerTerm {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "term_year")
    private int year;

    // 회장 / 부회장 / 총무
    private String role;

    private String name;

    // "22" 같은 두 자리 학번(선택)
    private String studentId;

    // "manual"은 MySQL 예약어라 컬럼 이름을 따로 준다
    @Column(name = "is_manual")
    private boolean manual;

    private LocalDateTime updatedAt = LocalDateTime.now();
}
