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
public class AchievementMember {
    // 부원이 아닌 사람(외부 팀원 등)은 loginId 없이 이름만
    private String loginId;
    private String name;
    private String studentId;
}
