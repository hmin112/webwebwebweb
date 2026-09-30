package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

// ✨ [2026-09-30 신규] 바깥에서 가져온 일정 — 조선대 학사일정(CHOSUN_ACADEMIC), SW중심대학 지원 프로그램 신청기간(SW_PROGRAM).
// 원본에서 사라져도(신청 마감 후 목록에서 빠지는 등) 한 번 가져온 건 남겨서 캘린더에 계속 보이게 한다.
@Entity
@Table(name = "external_schedule",
        uniqueConstraints = @UniqueConstraint(columnNames = {"source", "external_id"}))
@Getter @Setter
public class ExternalSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String source;

    @Column(name = "external_id")
    private String externalId;

    private String title;

    private String category;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 500)
    private String url;

    private LocalDateTime updatedAt = LocalDateTime.now();
}
