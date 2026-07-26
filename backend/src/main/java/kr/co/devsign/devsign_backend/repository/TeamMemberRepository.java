package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTeam_Id(Long teamId);

    Optional<TeamMember> findByTeam_IdAndLoginId(Long teamId, String loginId);

    List<TeamMember> findByLoginIdAndTeam_YearAndTeam_Semester(String loginId, int year, int semester);

    List<TeamMember> findByTeam_IdAndStatus(Long teamId, String status);

    void deleteByTeam_Id(Long teamId);
}
