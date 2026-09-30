package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class AssemblyProject {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String loginId;
    private int year;
    private int semester;
    private String title;

    // ✨ [2026-09-30 추가] 이번 학기 대표 프로젝트 — "PERSONAL" 또는 "TEAM:{teamId}". 비어 있으면 자동 선택
    // (팀 프로젝트가 있으면 팀, 없으면 자료를 올린 개인 프로젝트). 커뮤니티에 이 프로젝트가 보인다.
    private String representativeKey;

    // ✨ [2026-09-07 추가] 마이페이지 학기별 깃/노션 등 관련 링크 — Git/Notion 링크(PlanLink,
    // 계획서 편집기의 planLinks와 동일한 임베더블 재사용)를 프로젝트 명과 같은 단위(loginId+year+semester)로 저장
    @ElementCollection
    @CollectionTable(name = "assembly_project_links", joinColumns = @JoinColumn(name = "project_id"))
    private List<PlanLink> links = new ArrayList<>();
}