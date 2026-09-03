package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String category;    // 카테고리 (회비, 자유, 질문)

    // ✨ 작성자 관련 상세 정보
    private String author;      // 작성자 이름
    private String loginId;     // 작성자 아이디 (수정/삭제 권한 확인용)
    private String studentId;   // 학번

    @Column(columnDefinition = "LONGTEXT")
    private String profileImage; // 작성자 프로필 이미지 (Base64)

    // ✨ [신규] 회비(category="회비") 게시글 전용 구조화 필드 — 다른 카테고리는 항상 null
    private String feeAmount;    // 회비 금액 (예: "50,000원")
    private String feeAccount;   // 납부 계좌 (예: "카카오뱅크 3333-01-1234567 (김형민)")
    private String feeDeadline;  // 납부 기한 (예: "2026-09-30")
    private String feeTerm;      // 대상 학기 (예: "2026년 2학기")

    private int views = 0;
    private int likes = 0;

    @Transient
    private boolean likedByMe;

    // ✨ 이미지 경로 리스트 저장
    // 이제 Base64가 아니라 "/uploads/..." 주소가 저장되므로 
    // columnDefinition을 TEXT 정도로만 두어도 충분합니다 (성능 향상)
    @ElementCollection
    @CollectionTable(name = "post_images", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "image_data", columnDefinition = "TEXT") 
    private List<String> images = new ArrayList<>();

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<Comment> commentsList = new ArrayList<>();

    private LocalDateTime createdAt = LocalDateTime.now();

    private String date;
}