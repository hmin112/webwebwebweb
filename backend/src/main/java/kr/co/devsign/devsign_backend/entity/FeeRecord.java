package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// ✨ [2026-09-09 신규] 월별 회비 기록 한 줄 = "그 달의 대상자 1명".
// 이름/학번/상태를 그 달 기준으로 복사해 저장(스냅샷)한다. 회원 정보가 나중에 바뀌거나
// 계정이 삭제돼도 지난 달 기록은 그대로 남고, 9월에 들어온 부원이 6월 명단에
// 끼어들지도 않는다 — 지난 달 명단은 이 테이블만 보고 그린다.
@Entity
@Getter @Setter
@Table(name = "fee_record", uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month", "login_id"}))
public class FeeRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private int month;

    @Column(name = "login_id", nullable = false)
    private String loginId;

    // 그 달 기준 스냅샷
    private String name;
    private String studentId;
    private String userStatus;

    private boolean paid;
    private LocalDateTime paidAt;
}
