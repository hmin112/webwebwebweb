package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// ✨ [2026-09-30 신규] 캘린더 일정 — 행사 글(Event)을 쓰지 않고 관리자가 캘린더에 바로 넣는 일정(세미나, 마감, 회의 등).
// membersOnly면 로그인한 부원에게만 보인다.
@Entity
@Getter @Setter
public class ClubSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    // "2026.04.27" 형식 (행사 날짜와 같은 형식)
    private String date;

    // ✨ 여러 날 이어지는 일정이면 마지막 날 (없으면 하루 일정)
    private String endDate;

    // 학술 / 친목 / 대회 / 기타
    private String category;

    private String location;

    @Column(columnDefinition = "TEXT")
    private String memo;

    private boolean membersOnly = false;

    private String createdBy;

    private LocalDateTime createdAt = LocalDateTime.now();
}
