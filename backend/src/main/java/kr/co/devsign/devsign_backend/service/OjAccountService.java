package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.entity.OjAccount;
import kr.co.devsign.devsign_backend.repository.OjAccountRepository;
import kr.co.devsign.devsign_backend.util.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * devsign 회원이 OJ 탭을 처음 열 때, 그 자리에서 조용히 전용 OJ 계정을 하나 만들어주는 역할.
 * 기존에 부원들이 수기로 만들어 쓰던 OJ 계정과는 완전히 분리된 새 계정("dv_" 접두사)이며,
 * 회원은 OJ 아이디/비밀번호를 전혀 몰라도 된다 — devsign 로그인만으로 그대로 동작한다.
 */
@Service
@RequiredArgsConstructor
public class OjAccountService {

    private final OjAccountRepository ojAccountRepository;
    private final OjClient ojClient;
    private final CryptoUtil cryptoUtil;

    // 동시에 같은 회원이 처음 접속해 이중 발급되는 걸 막기 위한 간단한 락. 동아리 규모상
    // 이 메서드 호출 빈도가 낮아 synchronized로 충분하다.
    public synchronized String ensureAppkey(Member member) {
        return ojAccountRepository.findByMember(member)
                .map(account -> cryptoUtil.decrypt(account.getOjAppkeyEncrypted()))
                .orElseGet(() -> provision(member));
    }

    private String provision(Member member) {
        String ojUsername = ("dv_" + member.getLoginId()).toLowerCase();
        String temporaryPassword = UUID.randomUUID().toString();
        String email = ojUsername + "@devsign.local";
        String realName = member.getName();

        ojClient.createUser(ojUsername, temporaryPassword, email, realName);

        Long ojUserId = ojClient.findUserIdByUsername(ojUsername);
        if (ojUserId == null) {
            throw new IllegalStateException("OJ 계정 생성 직후 조회에 실패했습니다: " + ojUsername);
        }

        ojClient.enableOpenApi(ojUserId, ojUsername, email, realName);
        String appkey = ojClient.fetchAppkeyViaLogin(ojUsername, temporaryPassword);

        OjAccount account = new OjAccount();
        account.setMember(member);
        account.setOjUserId(ojUserId);
        account.setOjUsername(ojUsername);
        account.setOjAppkeyEncrypted(cryptoUtil.encrypt(appkey));
        account.setCreatedAt(LocalDateTime.now());
        ojAccountRepository.save(account);

        return appkey;
    }
}
