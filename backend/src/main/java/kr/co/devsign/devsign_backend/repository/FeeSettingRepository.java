package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.FeeSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeeSettingRepository extends JpaRepository<FeeSetting, Long> {
    Optional<FeeSetting> findByYearAndMonth(int year, int month);
}
