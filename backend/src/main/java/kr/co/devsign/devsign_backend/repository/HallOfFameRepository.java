package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.HallOfFame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HallOfFameRepository extends JpaRepository<HallOfFame, Long> {
}
