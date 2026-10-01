package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.PrintJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PrintJobRepository extends JpaRepository<PrintJob, Long> {
    List<PrintJob> findTop30ByLoginIdAndStatusInOrderByIdDesc(String loginId, List<String> statuses);

    Optional<PrintJob> findFirstByStatusOrderByQueuedAtAscIdAsc(String status);

    long countByStatusAndIdLessThan(String status, Long id);

    long countByStatus(String status);

    List<PrintJob> findByStatusAndClaimedAtBefore(String status, LocalDateTime before);

    List<PrintJob> findByStatusInAndCreatedAtBefore(List<String> statuses, LocalDateTime before);
}
