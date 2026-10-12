package com.course.backend.modules.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/9
 */

@Data
public class ChangePasswordRequest {
    // 旧密码
    @NotBlank
    @Schema(description = "旧密码", name = "old_password", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("old_password")
    private String oldPassword;

    // 新密码
    @NotBlank
    @Schema(description = "新密码", name = "old_password", requiredMode = Schema.RequiredMode.REQUIRED)
    @JsonProperty("new_password")
    @Size(min = 8, message = "密码长度不能小于8位")
    private String newPassword;
}
