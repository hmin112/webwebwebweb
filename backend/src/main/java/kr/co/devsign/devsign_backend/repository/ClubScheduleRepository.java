package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.ClubSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClubScheduleRepository extends JpaRepository<ClubSchedule, Long> {
    List<ClubSchedule> findAllByOrderByDateAsc();
}
