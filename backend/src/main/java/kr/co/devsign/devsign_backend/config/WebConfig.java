package kr.co.devsign.devsign_backend.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private UserStatusInterceptor userStatusInterceptor;

    // ✨ application.properties에서 설정한 파일 저장 경로(/app/uploads)를 가져옵니다.
    @Value("${app.upload.base-dir}")
    private String uploadDir;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 기존 인터셉터 설정 유지
        registry.addInterceptor(userStatusInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/members/login", "/api/members/signup");
    }

    // ✨ [추가] 정적 리소스 핸들러 설정
    // 브라우저가 https://devsign.co.kr/uploads/파일명.png 로 접근하면
    // 서버의 /app/uploads/파일명.png 파일을 찾아 응답해줍니다.
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/");
    }
}