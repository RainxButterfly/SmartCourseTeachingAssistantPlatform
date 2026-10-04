package com.course.backend.security;

import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.config.properties.JwtProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录鉴权拦截器：验证请求头中的 JWT
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        // 1. 执行CORS 预检请求（OPTIONS 不带Authorization）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 2. 从请求头中解析token， 例如 "Bearer xxx.yyy.zzz" -> "xxx.yyy.zzz"
        String header = request.getHeader(jwtProperties.getHeader());
        String token = jwtService.resolveBearerToken(header);

        // 3. 校验token并提取userId
        Long userId = jwtService.extractUserId(token);
        if (userId == null) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "登录已失效，请重新登录");
        }

        // 4. 放入用户上下文 为后续继续使用
        UserContext.set(userId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                @Nullable Exception ex) throws Exception {
        // 请求结束后必须清理，否则线程池复用userId会串到其他请求
        UserContext.clear();
    }
}
