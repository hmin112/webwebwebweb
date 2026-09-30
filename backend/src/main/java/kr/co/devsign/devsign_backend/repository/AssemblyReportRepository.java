package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AssemblyReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssemblyReportRepository extends JpaRepository<AssemblyReport, Long> {
    List<AssemblyReport> findByLoginIdAndYearAndSemesterOrderByMonthAsc(String loginId, int year, int semester);

    // ✨ [2026-09-30] 활동 대시보드 — 한 학기 전체 부원 제출 현황을 한 번에
    List<AssemblyReport> findByYearAndSemester(int year, int semester);

    long countByYearAndSemesterAndMonthAndStatus(int year, int semester, int month, String status);

    List<AssemblyReport> findByYearAndSemesterAndMonthAndStatusOrderByIdDesc(int year, int semester, int month, String status);

    List<AssemblyReport> findByLoginIdInAndYearAndMonthAndStatus(List<String> loginIds, int year, int month, String status);
}
