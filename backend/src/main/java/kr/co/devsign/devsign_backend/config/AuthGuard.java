package kr.co.devsign.devsign_backend.config;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

// ✨ [2026-09-29 신규] 요청 본문/파라미터로 받은 loginId가 JWT로 인증된 본인과 같은지 확인한다.
// 클라이언트가 보낸 loginId만 믿으면 다른 부원 명의로 제출물을 덮어쓰거나 팀을 조작할 수 있어서,
// 본인 명의로 쓰기 작업을 하는 엔드포인트는 서비스 호출 전에 반드시 이걸 거친다.
public final class AuthGuard {

    private AuthGuard() {
    }

    public static void requireSelf(Authentication authentication, String loginId) {
        if (authentication == null || loginId == null || !loginId.equals(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인 계정으로만 요청할 수 있습니다.");
        }
    }
}
