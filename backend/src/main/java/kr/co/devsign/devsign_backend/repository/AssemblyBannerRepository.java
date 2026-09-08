package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AssemblyBanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssemblyBannerRepository extends JpaRepository<AssemblyBanner, Long> {
    Optional<AssemblyBanner> findByYearAndMonth(int year, int month);
    List<AssemblyBanner> findByYearOrderByMonthAsc(int year);
}
