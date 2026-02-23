package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter @Setter
public class AssemblyReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String loginId;

    @Column(name = "report_year") // ✨ year는 SQL 예약어이므로 컬럼명 변경
    private int year;

    private int semester;

    @Column(name = "report_month") // ✨ month는 H2 예약어이므로 컬럼명 변경
    private int month;

    private String type;
    private String status;
    private String title;

    @Column(length = 1000)
    private String memo;

    private String date;
    private String deadline;

    private String presentationPath;
    private String pdfPath;
    private String otherPath;
}