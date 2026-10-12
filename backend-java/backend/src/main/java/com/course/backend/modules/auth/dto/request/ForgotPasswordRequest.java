package com.course.backend.modules.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/9
 */

@Data
public class ForgotPasswordRequest {
    @NotBlank
    @JsonProperty("email")
    @Email(message = "邮箱格式不正确")
    @Schema(description = "邮箱", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;
}
