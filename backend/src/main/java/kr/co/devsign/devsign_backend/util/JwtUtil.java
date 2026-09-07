package kr.co.devsign.devsign_backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    // 자동 로그인 체크를 안 했을 때 발급하는 짧은 세션의 유효기간 — 1시간
    private static final long SHORT_SESSION_EXPIRATION_MS = 3_600_000L;

    // SecretKey 생성 헬퍼 메서드
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    // JWT 토큰 생성 — tokenVersion을 클레임에 심어둬서, 로그아웃 시 이 값이 바뀌면
    // (만료 전이라도) 이 토큰은 더 이상 유효하지 않은 것으로 취급된다(JwtAuthenticationFilter 참고).
    // rememberMe(자동 로그인 체크)가 false면 1시간짜리 짧은 토큰을, true면 jwt.expiration(사실상
    // 무제한)짜리 토큰을 발급한다 — 어느 쪽이든 로그아웃하면 즉시 무효화되는 건 동일.
    public String generateToken(String loginId, String role, long tokenVersion, boolean rememberMe) {
        Date now = new Date();
        long ttl = rememberMe ? expiration : SHORT_SESSION_EXPIRATION_MS;
        Date expiryDate = new Date(now.getTime() + ttl);

        return Jwts.builder()
                .subject(loginId)
                .claim("role", role)
                .claim("tv", String.valueOf(tokenVersion))
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    // 토큰에서 loginId 추출
    public String getLoginIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    // 토큰에서 role 추출
    public String getRoleFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("role", String.class);
    }

    // 토큰에서 tokenVersion 추출 (없는 옛 토큰이면 -1을 반환해 항상 무효 처리되게 함)
    public long getTokenVersionFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String tv = claims.get("tv", String.class);
        if (tv == null) {
            return -1L;
        }
        try {
            return Long.parseLong(tv);
        } catch (NumberFormatException e) {
            return -1L;
        }
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // 토큰 만료 확인
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return true;
        }
    }

    // HttpServletRequest에서 loginId 추출 (컨트롤러 편의 메서드)
    public String getLoginIdFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (validateToken(token)) {
                return getLoginIdFromToken(token);
            }
        }
        return null;
    }
}
