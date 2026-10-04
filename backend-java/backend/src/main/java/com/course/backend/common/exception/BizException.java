package com.course.backend.common.exception;

import com.course.backend.common.enums.ErrorCode;
import lombok.Getter;

/**
 * 业务异常，携带错误码，供全局异常处理器识别。
 * 业务代码中一律抛出本异常，不要抛 RuntimeException。
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Getter
public class BizException extends RuntimeException{

    /**
     * 错误码枚举，包含 code + httpStatus + 默认文案
     * */
    private final ErrorCode errorCode;

    /**
     * 使用 ErrorCode 默认文案
     */
    public BizException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * 覆盖 ErrorCode 默认文案，适合需要拼接动态信息的场景
     * 例如：new BizException(ErrorCode.NOT_FOUND, "课程不存在: " + courseId)
     */
    public BizException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * 额外携带原始异常，保留堆栈（一般用于包装底层异常）
     */
    public BizException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }
}
