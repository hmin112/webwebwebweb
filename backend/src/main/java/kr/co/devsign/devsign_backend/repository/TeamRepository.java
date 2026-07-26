package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByYearAndSemesterOrderByIdAsc(int year, int semester);
}
