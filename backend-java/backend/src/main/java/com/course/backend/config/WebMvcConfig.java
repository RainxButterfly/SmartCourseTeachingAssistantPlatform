package com.course.backend.config;

import com.course.backend.security.AuthInterceptor;
import com.course.backend.security.CurrentUserIdArgumentResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final CurrentUserIdArgumentResolver currentUserIdArgumentResolver;

    /**
     * 注册拦截器，统一鉴权
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
       registry.addInterceptor(authInterceptor)
               .addPathPatterns("/**")    // 拦截所有请求
               .excludePathPatterns(      // 放行公开接口
                       "/auth/login",     // 登录
                       "/auth/register",  // 注册
                       "/auth/captcha",   // 验证码
                       "/auth/refresh",   // 刷新token
                       "/demo/**",        // 示例接口
                       "/error",          // 错误路径
                       "/doc.html",       // knife4j
                       "/webjars/**",
                       "/v3/api-docs/**",
                       "/swagger-ui/**"
               );
    }

    /**
     * 注册参数解析器，让 @CurrentUserId Long userId 自动注入
     */
    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdArgumentResolver);
    }

    /**
     * 跨域配置
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*") // 生产环境建议换成真实域名，如 https://admin.example.com
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
