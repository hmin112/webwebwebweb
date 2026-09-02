package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// OJ 폴더는 원래 QDUOJ 문제의 태그(자유 문자열) 하나일 뿐이라 실제 데이터는 없지만,
// "빈 폴더를 미리 만들어두고 나중에 문제를 끌어다 넣는" 관리자 UX를 위해 devsign 쪽에
// 이 폴더가 존재한다는 것만 별도로 기억해두는 최소한의 레지스트리.
@Entity
@Getter @Setter
public class OjFolder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // "OOP/2023"처럼 "/"로 중첩 경로를 표현
    @Column(unique = true, nullable = false)
    private String path;

    private LocalDateTime createdAt = LocalDateTime.now();
}
