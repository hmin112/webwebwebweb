package kr.co.devsign.devsign_backend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT")
    private String content;

    // ✨ 작성자 관련 상세 정보
    private String author;
    private String loginId;
    private String studentId;

    @Column(columnDefinition = "LONGTEXT")
    private String profileImage;

    private String date;
    private LocalDateTime createdAt = LocalDateTime.now();

    // ✨ 댓글 좋아요 기능
    private int likes = 0;

    @Transient
    private boolean likedByMe; // DB 저장 안 함, 현재 접속자가 좋아요 눌렀는지 확인용

    // ✨ [추가] 답글 여부 구분 필드
    // 이 필드가 있어야 메인 댓글 목록에서 답글이 중복으로 나오는 것을 방지할 수 있습니다.
    private boolean isReply = false;

    // ✨ 게시글과의 연관관계 설정
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    @JsonIgnore
    private Post post;

    // ✨ [인스타 스타일] 대댓글 기능을 위한 셀프 참조 (부모 댓글)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    @JsonIgnore
    private Comment parent;

    // ✨ [핵심] 대댓글 리스트 (부모 삭제 시 자식 자동 삭제 설정)
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC") // 대댓글은 작성 순서대로 정렬
    private List<Comment> replies = new ArrayList<>();
}