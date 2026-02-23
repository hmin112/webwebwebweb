package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.DiscordAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DiscordAuthRepository extends JpaRepository<DiscordAuth, Long> {
    // 발송된 인증번호 찾기
    Optional<DiscordAuth> findTopByDiscordTagOrderByExpiryDesc(String discordTag);

    // 인증번호로 데이터를 찾기
    Optional<DiscordAuth> findByCode(String code);
}