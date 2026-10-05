package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AchievementFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AchievementFileRepository extends JpaRepository<AchievementFile, Long> {
    List<AchievementFile> findByAchievementIdInOrderByIdAsc(Collection<Long> achievementIds);

    List<AchievementFile> findByAchievementIdOrderByIdAsc(Long achievementId);

    List<AchievementFile> findByEntryId(Long entryId);
}
