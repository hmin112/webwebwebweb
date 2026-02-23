package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Event;
import kr.co.devsign.devsign_backend.entity.EventView;
import kr.co.devsign.devsign_backend.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventViewRepository extends JpaRepository<EventView, Long> {

    boolean existsByMemberAndEvent(Member member, Event event);

    void deleteByEvent(Event event);
}