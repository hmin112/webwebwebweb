package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.ExternalSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExternalScheduleRepository extends JpaRepository<ExternalSchedule, Long> {
    Optional<ExternalSchedule> findBySourceAndExternalId(String source, String externalId);

    List<ExternalSchedule> findAllByOrderByStartDateAsc();
}
