package com.course.backend.common.interceptor;

import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.util.RedisKeyBuilder;
import com.course.backend.config.properties.RedisProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;

/**
 * 防重复提交拦截器
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Component
@RequiredArgsConstructor
public class IdempotentInterceptor implements HandlerInterceptor {
    private final StringRedisTemplate redisTemplate;
    private final RedisKeyBuilder redisKeyBuilder;
    private final RedisProperties redisProperties;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NotNull HttpServletResponse response,
                             @NotNull Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return true;

        String key = request.getHeader("X-Idempotency-Key");
        if (key == null || key.isBlank()) return true;

        Boolean exist = redisTemplate.opsForValue()
                .setIfAbsent(redisKeyBuilder.courseIdem(key),
                        "1",
                        Duration.ofSeconds(redisProperties.getIdempotentTtl()));
        if (Boolean.FALSE.equals(exist)) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "请勿重复提交");
        }
        return true;
    }
}
