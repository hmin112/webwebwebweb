package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.FeeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeeRecordRepository extends JpaRepository<FeeRecord, Long> {
    List<FeeRecord> findByYearAndMonthOrderByIdAsc(int year, int month);
    Optional<FeeRecord> findByYearAndMonthAndLoginId(int year, int month, String loginId);
}
