package com.course.backend.common.filter;

/**
 * 链路追踪过滤器：
 * 1. 从请求头 X-Request-Id 读取 traceId，缺失则生成 UUID
 * 2. 写入 MDC（key = traceId），供日志 pattern 使用
 * 3. 回写响应头 X-Request-Id
 * 4. 请求结束清理 MDC，避免线程池复用污染
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */
public class TraceIdFilter {

}
