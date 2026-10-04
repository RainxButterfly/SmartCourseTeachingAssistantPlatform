package com.course.backend.common.filter;

import cn.hutool.core.lang.UUID;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 链路追踪过滤器：
 * 1. 从请求头 X-Request-Id 读取 traceId，缺失则生成 UUID
 * 2. 写入 MDC（key = traceId），供日志 pattern 使用
 * 3. 回写响应头 X-Request-Id
 * 4. 请求结束清理 MDC，避免线程池复用污染
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // 确保最早执行
public class TraceIdFilter extends OncePerRequestFilter {

    public static final String TRACE_ID_HEADER = "X-Request-Id";
    public static final String TRACE_ID_MDC = "traceId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 1. 从请求头中获取traceId，没有则生成
        String traceId = request.getHeader(TRACE_ID_HEADER);
        if (traceId == null || traceId.isEmpty()) {
            traceId = UUID.randomUUID().toString().replace("-", "");
        }

        // 2. 放入MDC
        MDC.put(TRACE_ID_MDC, traceId);

        // 3. 回写响应头
        response.setHeader(TRACE_ID_HEADER, traceId);

        try {
            // 4. 放行请求
            filterChain.doFilter(request, response);
        } finally {
            // 5. 清理MDC， 防止线程池复用导致traceId 串号
            MDC.remove(TRACE_ID_MDC);
        }
    }
}
