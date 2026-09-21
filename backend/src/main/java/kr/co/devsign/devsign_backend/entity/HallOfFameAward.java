package kr.co.devsign.devsign_backend.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
@Table(name = "hall_of_fame_awards")
public class HallOfFameAward {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "hall_of_fame_id", nullable = false)
    private HallOfFame hallOfFame;

    @Column(nullable = false)
    private String awardName;

    @Column(nullable = false)
    private int displayOrder;

    @ElementCollection
    @CollectionTable(name = "hall_of_fame_award_participants", joinColumns = @JoinColumn(name = "award_id"))
    @Column(name = "login_id")
    private List<String> participantLoginIds = new ArrayList<>();
}
