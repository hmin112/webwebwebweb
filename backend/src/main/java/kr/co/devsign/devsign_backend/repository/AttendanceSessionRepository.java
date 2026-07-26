package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    Optional<AttendanceSession> findTopByOrderByIdDesc();

    List<AttendanceSession> findByStatusOrderByStartedAtDesc(String status);
}
