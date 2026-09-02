package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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

    // ✨ [2026-09-02 추가] 계획서(PLAN)를 파일 업로드 대신 웹에서 바로 작성할 수 있도록 추가한 필드들.
    // 예전 학기의 PLAN 제출은 파일 경로만 채워져 있고 이 필드들은 비어있는 채로 남아있음(마이그레이션 없음) —
    // 화면에서는 이 필드 중 하나라도 값이 있으면 "웹 작성 계획서"로, 없으면 기존처럼 파일 기반으로 취급한다.
    @Column(columnDefinition = "LONGTEXT")
    private String planGoal;          // 목표

    @Column(columnDefinition = "LONGTEXT")
    private String planSchedule;      // 추진 일정

    @Column(columnDefinition = "LONGTEXT")
    private String planTeamRoles;     // 팀 구성 및 역할 분담

    @Column(columnDefinition = "LONGTEXT")
    private String planBudget;        // 예산 계획

    @Column(columnDefinition = "LONGTEXT")
    private String planNotes;         // 기타 참고사항
}