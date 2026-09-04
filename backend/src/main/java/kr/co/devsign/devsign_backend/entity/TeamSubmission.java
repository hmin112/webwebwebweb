package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// 팀 프로젝트 탭에서 팀원 누구나 올릴 수 있는 "팀 공유 자료" 제출. 개인 마이페이지의
// AssemblyReport와는 완전히 독립적인 별도 트랙 — 팀에 속해 있어도 개인 제출은 그대로 유지된다.
@Entity
@Getter @Setter
public class TeamSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "submission_year")
    private int year;

    private int semester;

    @Column(name = "submission_month")
    private int month;

    private String type;   // PLAN / RESULT / PROGRESS (AssemblyReport와 동일한 규칙)
    private String status; // NOT_SUBMITTED / DRAFT / SUBMITTED
    private String date;

    // 팀원 누구나 수정할 수 있어서, 마지막으로 누가 수정했는지 투명하게 남겨둔다
    private String updatedBy;

    // 파일 업로드용(진행보고/결과물 달)
    private String presentationPath;
    private String pdfPath;
    private String otherPath;

    @Column(length = 1000)
    private String memo;

    // 계획서(PLAN, 3월/9월)용 — AssemblyReport의 구조화 계획서와 동일한 필드 구성,
    // PlanRoadmapItem/PlanRole/PlanLink 임베더블을 그대로 재사용
    @Column(columnDefinition = "LONGTEXT")
    private String planOverview;

    @ElementCollection
    @CollectionTable(name = "team_submission_plan_goals", joinColumns = @JoinColumn(name = "team_submission_id"))
    @Column(name = "goal_text", columnDefinition = "TEXT")
    private List<String> planGoals = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "team_submission_roadmap_items", joinColumns = @JoinColumn(name = "team_submission_id"))
    private List<PlanRoadmapItem> planRoadmapItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "team_submission_roles", joinColumns = @JoinColumn(name = "team_submission_id"))
    private List<PlanRole> planRoles = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "team_submission_links", joinColumns = @JoinColumn(name = "team_submission_id"))
    private List<PlanLink> planLinks = new ArrayList<>();

    @Column(columnDefinition = "LONGTEXT")
    private String planNotes;

    private LocalDateTime createdAt = LocalDateTime.now();
}
