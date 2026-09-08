package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// ✨ [2026-09-08 신규] 관리자가 월별로 편집하는 총회 배너(WWDC 스타일 대시보드) 내용.
// 날씨/시계/카운트다운처럼 실시간으로 계산되는 값은 저장하지 않고 화면에서 그때그때 계산한다 —
// 여기엔 관리자가 직접 입력하는 텍스트/숫자만 저장.
@Entity
@Getter @Setter
@Table(name = "assembly_banner", uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month"}))
public class AssemblyBanner {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private int month;

    // 비어있으면 프론트에서 "{month}월 총회"로 기본 표시
    private String title;

    @ElementCollection
    @CollectionTable(name = "assembly_banner_notices", joinColumns = @JoinColumn(name = "banner_id"))
    @Column(name = "content", length = 500)
    @OrderColumn(name = "sort_order")
    private List<String> notices = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "assembly_banner_agenda", joinColumns = @JoinColumn(name = "banner_id"))
    @Column(name = "content", length = 500)
    @OrderColumn(name = "sort_order")
    private List<String> agenda = new ArrayList<>();

    private Integer attendanceCount;

    @Column(length = 500)
    private String quote;

    // "HH:mm" 형식. 비어있으면 프론트에서 기본값(20:00) 사용
    private String targetEndTime;

    // 다음 총회 미리보기 카드용 — 비어있으면 프론트에서 해당 카드를 숨김
    private String nextAssemblyLabel;
    private LocalDate nextAssemblyDate;

    private LocalDateTime updatedAt;
}
