package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Event;
import kr.co.devsign.devsign_backend.entity.EventLike;
import kr.co.devsign.devsign_backend.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional; // ✨ 필수 임포트

public interface EventLikeRepository extends JpaRepository<EventLike, Long> {
    boolean existsByMemberAndEvent(Member member, Event event);

    // 좋아요 취소
    @Transactional
    void deleteByMemberAndEvent(Member member, Event event);

    void deleteByEvent(Event event);
}
