package com.course.backend.modules.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/6
 */

@Data
public class RegisterRequest {
    // 登录邮箱
    @NotBlank(message = "邮箱不能为空！")
    @Email(message = "邮箱格式不正确！")
    private String email;
    // 用户名
    @NotBlank(message = "用户名不能为空！")
    @Size(min = 2, max = 20, message = "用户名的长度必须是2-20字")
    private String username;
    // 密码
    @NotBlank(message = "密码不能为空！")
    @Size(min = 8, message = "密码长度不能小于8位")
    private String password;
}
