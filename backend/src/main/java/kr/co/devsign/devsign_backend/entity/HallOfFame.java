package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class HallOfFame {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String competitionName; // 대회명
    private String awardName;       // 수상내역

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String date; // 수상일자 (예: 2026.08.29)

    @Column(columnDefinition = "LONGTEXT")
    private String image; // 대표 사진 1장

    // 수상자(회원) loginId 목록 — 이름/사진은 저장하지 않고 조회 시점에 Member에서 최신 정보를 가져옴
    @ElementCollection
    @CollectionTable(name = "hall_of_fame_participants", joinColumns = @JoinColumn(name = "hall_of_fame_id"))
    @Column(name = "login_id")
    private List<String> participantLoginIds = new ArrayList<>();

    private LocalDateTime createdAt = LocalDateTime.now();
}
