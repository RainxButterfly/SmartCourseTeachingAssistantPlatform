package com.course.backend.common.exception;

import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.response.ApiResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.stream.Collectors;

/**
 * 全局异常处理器：统一把异常转换为 ApiResponse
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    /**
     * 业务异常：直接使用 ErrorCode 的 httpStatus + code + message
     */

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> handleBizException(BizException e) {
        log.warn("业务异常：code={}, message={}", e.getErrorCode().getCode(), e.getErrorCode().getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(errorCode, e.getMessage()));
    }

    /**
     * 参数校验异常：@RequestBody 配合 @Valid 校验失败
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        if (message.isEmpty()){
            message = ErrorCode.PARAM_ERROR.getMessage();
        }
        log.warn("参数校验失败：{}", message);
        return buildParamError(message);
    }

    /**
     * 参数校验异常：@RequestParam / @PathVariable 等约束校验失败
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolationException(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining("; "));
        log.warn("参数校验失败：{}", message);
        return buildParamError(message);
    }

    /**
     * 请求体不可读：JSON 格式错误、类型转换失败等
     */

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(HttpMessageNotReadableException e) {
        log.warn("请求体解析失败： {}", e.getMessage());
        return buildParamError(ErrorCode.PARAM_ERROR.getMessage());
    }

    /**
     * 404：接口不存在
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoHandlerFoundException(NoHandlerFoundException e) {
        log.warn("接口不存在：method={}, url={}", e.getHttpMethod(), e.getRequestURL());
        ErrorCode errorCode = ErrorCode.NOT_FOUND;
        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(errorCode, errorCode.getMessage()));
    }

    /**
     * 405：请求方法不支持（例如只支持 POST 却发了 GET）
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
        log.warn("请求方法不支持：{}", e.getMessage());
        ErrorCode paramError = ErrorCode.PARAM_ERROR;
        return ResponseEntity
                .status(paramError.getHttpStatus())
                .body(ApiResponse.fail(paramError, paramError.getMessage()));
    }

    /**
     * 兜底异常：不暴露堆栈，只记录日志
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("系统异常", e);
        ErrorCode internalError = ErrorCode.INTERNAL_ERROR;
        return ResponseEntity
                .status(internalError.getHttpStatus())
                .body(ApiResponse.fail(internalError, internalError.getMessage()));
    }

    /**
     * 统一构造参数错误响应
     */
    private ResponseEntity<ApiResponse<Void>> buildParamError(String message) {
        ErrorCode paramError = ErrorCode.PARAM_ERROR;
        return ResponseEntity
                .status(paramError.getHttpStatus())
                .body(ApiResponse.fail(paramError, message));
    }
}
