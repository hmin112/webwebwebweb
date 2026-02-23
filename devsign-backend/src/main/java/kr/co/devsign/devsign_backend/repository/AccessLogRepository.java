package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AccessLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
    List<AccessLog> findAllByOrderByTimestampDesc();
}
