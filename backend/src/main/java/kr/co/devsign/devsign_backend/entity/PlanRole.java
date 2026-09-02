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
    // 총회 팀 프로젝트로 연결된 실제 회원이면 loginId가 채워짐(프로필 사진 등은 조회 시점에
    // 팀 데이터에서 실시간으로 가져옴, 스냅샷 아님). 동아리 외부인을 수동으로 추가한 경우 null.
    private String loginId;
    private String name;   // 이름
    private String role;   // 역할
    private String duties; // 담당 업무
}
