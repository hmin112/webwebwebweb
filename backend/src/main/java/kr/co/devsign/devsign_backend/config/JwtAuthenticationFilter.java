package kr.co.devsign.devsign_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import kr.co.devsign.devsign_backend.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private MemberRepository memberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Authorization 헤더에서 JWT 토큰 추출
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7); // "Bearer " 제거

            // 토큰 유효성 검증
            if (jwtUtil.validateToken(token)) {
                String loginId = jwtUtil.getLoginIdFromToken(token);
                String role = jwtUtil.getRoleFromToken(token);
                long tokenVersion = jwtUtil.getTokenVersionFromToken(token);

                // 로그아웃 시 tokenVersion이 증가하므로, DB에 저장된 현재 값과 토큰에 박힌 값이
                // 다르면(=로그아웃 이후 발급되지 않은 옛 토큰이면) 만료 전이라도 인증하지 않는다
                Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);
                boolean tokenRevoked = memberOpt.isEmpty()
                        || memberOpt.get().isDeleted()
                        || memberOpt.get().getTokenVersion() != tokenVersion;

                if (!tokenRevoked) {
                    // Spring Security 인증 객체 생성 (ROLE_ 접두사 추가)
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    loginId,
                                    null,
                                    Collections.singletonList(authority)
                            );

                    // SecurityContext에 인증 정보 저장
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        }

        // 다음 필터로 요청 전달
        filterChain.doFilter(request, response);
    }
}
