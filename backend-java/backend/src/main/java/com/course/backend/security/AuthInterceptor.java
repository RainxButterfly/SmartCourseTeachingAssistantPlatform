package com.course.backend.security;

import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.config.properties.JwtProperties;
import com.course.backend.modules.auth.service.ITokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
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
@Slf4j
public class AuthInterceptor implements HandlerInterceptor {
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final ITokenBlacklistService blacklistService;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NotNull HttpServletResponse response,
                             @NotNull Object handler) {
        // 1. 执行CORS 预检请求（OPTIONS 不带Authorization）
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // 2. 从请求头中解析token， 例如 "Bearer xxx.yyy.zzz" -> "xxx.yyy.zzz"
        String header = request.getHeader(jwtProperties.getHeader());
        log.info("当前请求的header: {}", header);
        String token = jwtService.resolveBearerToken(header);
        log.info("解析出来的token：{}", token);

        if (token == null || token.isBlank()) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "登录已失效，请重新登录");
        }

        // 3. 校验token并提取userId
        Long userId = jwtService.extractUserId(token);
        if (userId == null) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "登录已失效，请重新登录");
        }
        log.info("提取出来的userId：{}", userId);
        
        // 4. 检验是否被吊销
        String jti = jwtService.extractJti(token);
        if (blacklistService.isBlacklisted(jti)) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "登录已失效，请重新登录");
        }

        // 5. 放入用户上下文 为后续继续使用
        UserContext.set(userId);

        return true;
    }

    @Override
    public void afterCompletion(@NotNull HttpServletRequest request,
                                @NotNull HttpServletResponse response,
                                @NotNull Object handler,
                                @Nullable Exception ex) {
        // 请求结束后必须清理，否则线程池复用userId会串到其他请求
        UserContext.clear();
    }
}
