package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 회비 사용 내역 게시글의 한 줄(입금 또는 사용 한 건)
@Embeddable
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class FeeLedgerItem {
    private String type;        // "입금" 또는 "사용"
    private String date;        // 날짜 (yyyy-MM-dd, 선택)
    private String description; // 내역 설명 (예: "간식 구입")
    private long amount;        // 금액(원)
}
