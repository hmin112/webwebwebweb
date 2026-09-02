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
public class PlanBudgetItem {
    private String item;   // 항목
    private String amount; // 금액
    private String note;   // 비고
}
