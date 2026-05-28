package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.VerificationGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerificationGrantRepository extends JpaRepository<VerificationGrant, Long> {
    Optional<VerificationGrant> findByTokenHash(String tokenHash);
}
