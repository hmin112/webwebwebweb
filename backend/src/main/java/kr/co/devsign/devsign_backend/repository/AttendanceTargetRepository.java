package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AttendanceTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceTargetRepository extends JpaRepository<AttendanceTarget, Long> {
    List<AttendanceTarget> findBySession_Id(Long sessionId);

    Optional<AttendanceTarget> findBySession_IdAndLoginId(Long sessionId, String loginId);
}
