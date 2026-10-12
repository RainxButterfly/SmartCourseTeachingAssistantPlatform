package com.course.backend.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/7
 */

@Data
public class LoginRequest {
    // 邮箱
    @NotBlank
    private String email;
    // 密码
    @NotBlank
    private String password;
}
