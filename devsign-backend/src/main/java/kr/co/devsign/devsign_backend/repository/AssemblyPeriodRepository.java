package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AssemblyPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssemblyPeriodRepository extends JpaRepository<AssemblyPeriod, Long> {
    List<AssemblyPeriod> findByYearOrderByMonthAsc(int year);

    Optional<AssemblyPeriod> findByYearAndSemesterAndMonth(int year, int semester, int month);
}
