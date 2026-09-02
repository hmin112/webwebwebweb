package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlanRoadmapItem {
    private String title;      // 짧은 제목 (로드맵 막대에 표시)
    private String startDate;  // 시작일 (yyyy-MM-dd)
    private String endDate;    // 종료일 (yyyy-MM-dd)

    @Column(columnDefinition = "TEXT")
    private String detail;     // 자세한 내용 (로드맵 아래 카드에서 작성)
}
