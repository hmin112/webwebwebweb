package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter @Setter
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    // ACTIVE, CLOSED
    private String status;

    private String title;

    private String createdBy;

    private LocalDateTime startedAt;

    private LocalDateTime closedAt;

    private int durationSeconds = 600;
}
