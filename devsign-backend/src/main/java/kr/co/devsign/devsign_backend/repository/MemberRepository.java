package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByLoginId(String loginId);

    Optional<Member> findByNameAndStudentId(String name, String studentId);

    Optional<Member> findByDiscordTag(String discordTag);

    List<Member> findAllByOrderByStudentIdDesc();

    List<Member> findByDeletedFalseOrderByStudentIdDesc();

    List<Member> findByDeletedTrueOrderByDeletedAtDesc();

    Optional<Member> findByIdAndDeletedTrue(Long id);

    Optional<Member> findByLoginIdAndDeletedTrue(String loginId);

    long countByDeletedFalse();
}
