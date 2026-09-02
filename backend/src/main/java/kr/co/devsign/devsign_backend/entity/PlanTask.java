package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PlanTask {
    private String task;      // 작업명
    private String assignee;  // 담당자
    private String deadline;  // 기한
}
