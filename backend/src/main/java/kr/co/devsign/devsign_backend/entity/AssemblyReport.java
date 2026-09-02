package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class AssemblyReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String loginId;

    @Column(name = "report_year") // ✨ year는 SQL 예약어이므로 컬럼명 변경
    private int year;

    private int semester;

    @Column(name = "report_month") // ✨ month는 H2 예약어이므로 컬럼명 변경
    private int month;

    private String type;
    private String status;
    private String title;

    @Column(length = 1000)
    private String memo;

    private String date;
    private String deadline;

    private String presentationPath;
    private String pdfPath;
    private String otherPath;

    // ✨ [2026-09-02 추가, 2026-09-03 구조화된 양식으로 재구성] 계획서(PLAN)를 파일 업로드 대신
    // 웹에서 바로 작성할 수 있도록 추가한 필드들. 예전 학기의 PLAN 제출은 파일 경로만 채워져 있고
    // 이 필드들은 비어있는 채로 남아있음(마이그레이션 없음) — planOverview 등 이 필드 중 하나라도
    // 값이 있으면 "웹 작성 계획서"로, 없으면 기존처럼 파일 기반으로 취급한다.
    @Column(columnDefinition = "LONGTEXT")
    private String planOverview;      // 배경 및 목표 개요

    @ElementCollection
    @CollectionTable(name = "assembly_plan_goals", joinColumns = @JoinColumn(name = "report_id"))
    @Column(name = "goal_text", columnDefinition = "TEXT")
    private List<String> planGoals = new ArrayList<>();          // 핵심 목표 (여러 개)

    // ✨ [2026-09-03] "작업 및 일정"을 단순 표 대신 기간이 있는 로드맵(막대) + 상세 카드로 재구성
    @ElementCollection
    @CollectionTable(name = "assembly_plan_roadmap_items", joinColumns = @JoinColumn(name = "report_id"))
    private List<PlanRoadmapItem> planRoadmapItems = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "assembly_plan_roles", joinColumns = @JoinColumn(name = "report_id"))
    private List<PlanRole> planRoles = new ArrayList<>();        // 역할 및 담당 (팀 프로젝트일 때만, 팀원 여러 명)

    // ✨ [2026-09-03 추가] Git/Notion 등 참고 링크 (여러 개 추가 가능)
    @ElementCollection
    @CollectionTable(name = "assembly_plan_links", joinColumns = @JoinColumn(name = "report_id"))
    private List<PlanLink> planLinks = new ArrayList<>();

    @Column(columnDefinition = "LONGTEXT")
    private String planNotes;         // 기타 참고사항
}