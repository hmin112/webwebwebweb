package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Column;
import lombok.Getter;
import lombok.Setter;

// 세션 시작 시점의 대상자 스냅샷(이름/학번/프로필사진) — 이후 회원 정보가 바뀌어도
// 그 시점 출석 이력은 그대로 보이도록 함 (VerificationGrant의 *Snapshot 필드와 동일한 목적)
@Entity
@Table(
        name = "attendance_target",
        uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "login_id"})
)
@Getter @Setter
public class AttendanceTarget {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private AttendanceSession session;

    @Column(name = "login_id", nullable = false)
    private String loginId;

    private String name;

    private String studentId;

    @Column(columnDefinition = "LONGTEXT")
    private String profileImage;
}
