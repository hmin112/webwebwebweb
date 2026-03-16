package kr.co.devsign.devsign_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.beans.factory.annotation.Value;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L); // preflight 캐시 1시간

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS 설정 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 보안 해제
                .csrf(csrf -> csrf.disable())

                // 3. 세션을 사용하지 않음 (JWT 방식)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // 4. 요청별 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // OPTIONS preflight 요청은 무조건 허용
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 인증 없이 접근 가능한 경로
                        .requestMatchers(
                                "/api/members/login",
                                "/api/members/signup",
                                "/api/members/send-code",        // 인증번호 발송 경로 추가
                                "/api/members/discord-send",
                                "/api/members/verify-code",
                                "/api/members/find-discord-by-info",
                                "/api/members/verify-id-pw",
                                "/api/members/reset-password-final",
                                "/api/members/check/**",
                                "/h2-console/**",
                                "/favicon.ico",
                                "/error"                         // 에러 페이지 허용 (무한 루프 방지)
                        ).permitAll()
                        // GET 요청은 비로그인도 허용
                        .requestMatchers(HttpMethod.GET,
                                "/api/posts/**",
                                "/api/notices/**",
                                "/api/events/**"
                        ).permitAll()
                        // 관리자 전용 경로
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // 나머지 모든 요청은 인증 필요
                        .anyRequest().authenticated()
                )

                // 5. JWT 필터 배치
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)

                // 6. 헤더 및 프레임 허용
                .headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }

    // 기본 시큐리티 비밀번호 생성을 방지하기 위한 빈 등록
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }
}