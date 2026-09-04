package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.TeamSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamSubmissionRepository extends JpaRepository<TeamSubmission, Long> {
    List<TeamSubmission> findByTeam_IdAndYearAndSemesterOrderByMonthAsc(Long teamId, int year, int semester);
    List<TeamSubmission> findByYearAndSemesterAndMonthAndStatus(int year, int semester, int month, String status);
}
