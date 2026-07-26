package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

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
}
