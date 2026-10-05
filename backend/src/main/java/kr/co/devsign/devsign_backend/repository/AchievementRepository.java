package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Achievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {
    List<Achievement> findByYearAndDeletedFalseOrderByStartDateAscIdAsc(int year);

    List<Achievement> findByHallOfFameIdNotNull();

    @Query("select a.year, count(a) from Achievement a where a.deleted = false group by a.year")
    List<Object[]> countByYear();
}
