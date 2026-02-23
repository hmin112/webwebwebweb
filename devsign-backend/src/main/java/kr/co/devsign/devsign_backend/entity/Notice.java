package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.List; // ✨ 이미지 리스트를 위해 추가

@Entity
@Getter @Setter
public class Notice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String tag;

    // ✨ 컨트롤러의 setCategory() 대응을 위해 추가
    private String category;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String author;
    private int views = 0;   // ✨ 초기값 0 설정

    private String date;

    // ✨ [수정] Base64 대용량 이미지 저장을 위해 LONGTEXT 타입 지정
    @ElementCollection
    @Column(columnDefinition = "LONGTEXT")
    private List<String> images;

    // ✨ 컨트롤러의 setImportant() 대응을 위해 추가
    private boolean important;

    private boolean pinned = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}