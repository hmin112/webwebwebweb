package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {
    List<FeePayment> findByYearAndMonth(int year, int month);
    Optional<FeePayment> findByYearAndMonthAndLoginId(int year, int month, String loginId);
}
