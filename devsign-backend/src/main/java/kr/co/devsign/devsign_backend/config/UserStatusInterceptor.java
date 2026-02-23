package kr.co.devsign.devsign_backend.config;

import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class UserStatusInterceptor implements HandlerInterceptor {

    @Autowired
    private MemberRepository memberRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // SecurityContext에서 인증된 사용자 정보 가져오기 (JWT 필터에서 설정됨)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() != null
                && !authentication.getPrincipal().equals("anonymousUser")) {

            String loginId = (String) authentication.getPrincipal();
            Optional<Member> memberOpt = memberRepository.findByLoginId(loginId);

            if (memberOpt.isPresent() && memberOpt.get().isSuspended()) {
                // ✨ 정지된 유저라면 요청을 차단하고 JSON 응답을 보냅니다.
                response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403 에러
                response.setContentType("application/json;charset=UTF-8");

                Map<String, Object> data = new HashMap<>();
                data.put("status", "suspended");
                data.put("message", "정지된 계정입니다. 즉시 로그아웃됩니다.");

                ObjectMapper mapper = new ObjectMapper();
                response.getWriter().write(mapper.writeValueAsString(data));

                return false; // 컨트롤러로 요청을 보내지 않음
            }
        }

        return true; // 정상 유저라면 요청 허용
    }
}