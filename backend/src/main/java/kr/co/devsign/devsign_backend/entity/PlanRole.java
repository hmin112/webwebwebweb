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
public class PlanRole {
    private String name;   // 이름
    private String role;   // 역할
    private String duties; // 담당 업무
}
