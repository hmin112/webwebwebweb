package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
        name = "assembly_period",
        uniqueConstraints = @UniqueConstraint(columnNames = {"period_year", "semester", "period_month"})
)
@Getter
@Setter
public class AssemblyPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "period_year", nullable = false)
    private int year;

    @Column(nullable = false)
    private int semester;

    @Column(name = "period_month", nullable = false)
    private int month;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;
}
