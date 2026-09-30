package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✨ 팀 프로젝트 탭에서만 보이는 팀 이름 (개인 마이페이지에는 노출되지 않음)
    private String teamName;

    // ✨ 마이페이지/커뮤니티의 총회 프로젝트 제목과 동기화되는 값
    private String projectTitle;

    private String leaderLoginId;

    private int year;

    private int semester;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ✨ [2026-09-30 추가] 팀 관련 링크(Git/Notion 등) — 계획서 양식에서 빼고 팀 탭에서 팀원 누구나 관리.
    // 커뮤니티 부원 상세에서 이 팀을 볼 때 버튼으로 보인다.
    @ElementCollection
    @CollectionTable(name = "team_links", joinColumns = @JoinColumn(name = "team_id"))
    private List<PlanLink> links = new ArrayList<>();
}
