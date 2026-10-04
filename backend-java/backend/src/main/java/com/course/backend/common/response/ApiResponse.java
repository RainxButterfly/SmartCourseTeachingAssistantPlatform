package com.course.backend.common.response;

import com.course.backend.common.enums.ErrorCode;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.slf4j.MDC;

/**
 * 统一响应体
 * @param <T> 业务数据类型
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Data
@AllArgsConstructor
public class ApiResponse<T> {
    // 业务状态码，0表示成功
    private int code;

    // 提示信息
    private String message;

    // 业务数据
    private T data;

    // 链路追踪 ID，与请求头 X-Request-Id 保持一致
    @JsonProperty("trace_id")
    private String traceId;

    // ─────────── 静态工厂方法 ───────────

    /** 成功，无数据返回 */
    public static <T> ApiResponse<T> ok() {
        return new ApiResponse<>(
                ErrorCode.SUCCESS.getCode(),
                ErrorCode.SUCCESS.getMessage(),
                null,
                MDC.get("traceId"));
    }

    /** 成功，携带数据 */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(
                ErrorCode.SUCCESS.getCode(),
                ErrorCode.SUCCESS.getMessage(),
                data,
                MDC.get("traceId"));
    }

    /** 失败，使用 ErrorCode 的默认文案 */
    public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
        return new ApiResponse<>(
                errorCode.getCode(),
                errorCode.getMessage(),
                null,
                MDC.get("traceId")
        );
    }

    /** 失败，覆盖 ErrorCode 的默认文案 */
    public static <T> ApiResponse<T> fail(ErrorCode errorCode, String message) {
        return new ApiResponse<>(
                errorCode.getCode(),
                message,
                null,
                MDC.get("traceId")
        );
    }
}
