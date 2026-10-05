package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

// 실적 안의 참가 팀/개인 — 상 이름과 참가 부원. 내려받을 때 이 단위로 폴더가 생긴다.
@Entity
@Table(name = "achievement_entry")
@Getter @Setter
public class AchievementEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    // 팀 이름 (비우면 참가자 이름으로 보여준다)
    private String name;

    // 상 이름 (대상, 우수상, 참가 …)
    private String award;

    private int sortOrder;

    // 그 시점의 이름·학번을 함께 저장 — 회원 정보가 바뀌거나 탈퇴해도 실적 기록은 그대로 남게
    @ElementCollection
    @CollectionTable(name = "achievement_entry_members", joinColumns = @JoinColumn(name = "entry_id"))
    @OrderColumn(name = "member_order")
    private List<AchievementMember> members = new ArrayList<>();
}
