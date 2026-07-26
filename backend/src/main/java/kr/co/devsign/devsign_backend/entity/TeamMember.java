package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "team_member",
        uniqueConstraints = @UniqueConstraint(columnNames = {"team_id", "login_id"})
)
@Getter @Setter
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "login_id", nullable = false)
    private String loginId;

    // PENDING, ACCEPTED
    private String status;

    private LocalDateTime invitedAt = LocalDateTime.now();

    private LocalDateTime respondedAt;
}
