package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySession_Id(Long sessionId);

    boolean existsBySession_IdAndLoginId(Long sessionId, String loginId);

    void deleteBySession_Id(Long sessionId);

    void deleteBySession_IdAndLoginId(Long sessionId, String loginId);
}
