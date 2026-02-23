package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@Table(name = "access_log") // DB에 생성될 테이블 이름
public class AccessLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String studentId;

    // LOGIN, LOGOUT, SIGNUP, POST_CREATE, LIKE, FILE_UPLOAD 등
    private String type;

    private String ip;

    private LocalDateTime timestamp;

    // ✨ 생성 시 자동으로 현재 시간 설정 (@PrePersist)
    // 이 메서드 덕분에 컨트롤러에서 별도로 시간을 세팅할 필요가 없습니다.
    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}