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

    // ✨ [2026-09-07 추가] 마이페이지 학기별 깃/노션 등 관련 링크 — Git/Notion 링크(PlanLink,
    // 계획서 편집기의 planLinks와 동일한 임베더블 재사용)를 프로젝트 명과 같은 단위(loginId+year+semester)로 저장
    @ElementCollection
    @CollectionTable(name = "assembly_project_links", joinColumns = @JoinColumn(name = "project_id"))
    private List<PlanLink> links = new ArrayList<>();
}