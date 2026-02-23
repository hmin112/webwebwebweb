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

    // ✨ 작성자 관련 상세 정보 (프론트엔드 프로필 연동)
    private String author;      // 작성자 이름
    private String loginId;     // 작성자 아이디 (수정/삭제 권한 확인용)
    private String studentId;   // 학번 (앞 2자리를 이용해 '22학번' 등으로 표시)

    @Column(columnDefinition = "LONGTEXT")
    private String profileImage; // 작성자 프로필 이미지 (Base64)

    private int views = 0;
    private int likes = 0;

    // ✨ [추가] 좋아요 상태 유지 필드
    // DB에 저장되지는 않지만, 상세 조회 시 현재 사용자가 좋아요를 눌렀는지 여부를 담아 보냅니다.
    @Transient
    private boolean likedByMe;

    // ✨ 게시글 첨부 이미지 (용량 초과 방지를 위해 LONGTEXT 설정)
    @ElementCollection
    @CollectionTable(name = "post_images", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "image_data", columnDefinition = "LONGTEXT")
    private List<String> images = new ArrayList<>();

    // ✨ 댓글 연관관계 (게시글 삭제 시 댓글도 함께 삭제되도록 설정)
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC") // ✨ 최신 댓글이 밑으로 가도록 오름차순 정렬로 수정
    private List<Comment> commentsList = new ArrayList<>();

    private LocalDateTime createdAt = LocalDateTime.now();

    // ✨ 프론트엔드 날짜/시간 표시용 (예: 02.06 18:30)
    private String date;
}