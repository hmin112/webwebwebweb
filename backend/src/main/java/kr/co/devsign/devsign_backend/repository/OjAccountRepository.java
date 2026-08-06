package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.OjAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OjAccountRepository extends JpaRepository<OjAccount, Long> {
    Optional<OjAccount> findByMember(Member member);
}
