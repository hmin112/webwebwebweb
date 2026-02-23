package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssemblyReportRepository extends JpaRepository<AssemblyReport, Long> {
    List<AssemblyReport> findByLoginIdAndYearAndSemesterOrderByMonthAsc(String loginId, int year, int semester);

    long countByYearAndSemesterAndMonthAndStatus(int year, int semester, int month, String status);

    List<AssemblyReport> findByYearAndSemesterAndMonthAndStatusOrderByIdDesc(int year, int semester, int month, String status);

    List<AssemblyReport> findByLoginIdInAndYearAndMonthAndStatus(List<String> loginIds, int year, int month, String status);
}
