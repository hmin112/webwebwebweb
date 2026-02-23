package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.AssemblyProject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AssemblyProjectRepository extends JpaRepository<AssemblyProject, Long> {
    Optional<AssemblyProject> findByLoginIdAndYearAndSemester(String loginId, int year, int semester);
}