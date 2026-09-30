package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.OfficerTerm;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OfficerTermRepository extends JpaRepository<OfficerTerm, Long> {
    List<OfficerTerm> findAllByOrderByYearDesc();

    List<OfficerTerm> findByYear(int year);

    Optional<OfficerTerm> findByYearAndRole(int year, String role);
}
