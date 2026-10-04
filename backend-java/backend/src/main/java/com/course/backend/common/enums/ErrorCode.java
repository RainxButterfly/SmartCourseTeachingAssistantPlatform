package com.course.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 统一错误码
 * code 为业务错误码，httpStatus 为 HTTP 状态码，message 为默认文案
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // ─── 成功 ───
    SUCCESS(0, 200, "ok"),

    //  ─── 1001~1009 参数/通用业务错误 ───
    PARAM_ERROR(1001, 400, "请求参数无效"),
    INVALID_OR_EXPIRED_TOKEN(1002, 401, "未登录或token已过期"),
    NO_PERMISSION(1003, 403, "没有操作权限"),
    NOT_FOUND(1004, 404, "资源不存在"),
    RESOURCE_CONFLICT(1005, 409, "资源已存在"),
    RELATED_DATA_EXIST(1006, 409, "资源下存在关联子资源"),
    OLD_PASSWORD_ERROR(1007, 400, "原密码不正确"),
    VERIFICATION_CODE_INVALID(1008, 400, "验证码不正确或已过期"),
    TOO_MANY_REQUESTS(1009, 429, "请求过于频繁，请稍后重试"),

    // ─── 2001~2003 上传相关 ───
    FILE_SIZE_EXCEEDED(2001, 413, "文件超过大小限制"),
    INVALID_FILE_TYPE(2002, 415, "不支持的文件格式"),
    PARSE_TASK_CONFLICT(2003, 400, "解析任务已存在"),

    // ─── 3001~3004 大模型 ───
    AI_SERVICE_UNAVAILABLE(3001, 503, "AI服务咋不可用"),
    AI_MODEL_TIMEOUT(3002, 503, "模型调用超时"),
    MATERIAL_NOT_PARSED(3003, 400, "资料尚未解析完成"),
    AI_NOT_CONFIGURED(3004, 503, "尚未配置大模型，请在设置中完成配置"),
    // ─── 9000 兜底 ───
    INTERNAL_ERROR(9000, 500, "系统内部错误");

    private final int code;
    private final int httpStatus;
    private final String message;

    /**
     * 根据 code 反查枚举，找不到返回 null
     */
    public static ErrorCode of(int code) {
        for (ErrorCode e : values()) {
            if (e.code == code) {
                return e;
            }
        }
        return null;
    }
}
