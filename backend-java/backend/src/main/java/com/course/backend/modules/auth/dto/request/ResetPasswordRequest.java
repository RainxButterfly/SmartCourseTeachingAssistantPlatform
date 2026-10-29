package com.course.backend.modules.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 重置密码请求
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */

@Data
public class ResetPasswordRequest {
    /**
     * 接收验证码的邮箱
     */
    @NotBlank
    @JsonProperty("email")
    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;
    /**
     * 6 位数字验证码；错误 / 已过期 / 邮箱未注册统一返回 1008
     */
    @NotBlank
    @JsonProperty("code")
    @Schema(description = "验证码", requiredMode = Schema.RequiredMode.REQUIRED)
    private String code;
    /**
     * 新密码，≥8 位且同时含小写字母、大写字母与数字；违规返回 1001
     */
    @JsonProperty("new_password")
    @Schema(description = "新密码", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String newPassword;
}
