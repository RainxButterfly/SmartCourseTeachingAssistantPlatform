package com.course.backend.modules.auth.dto.response;

import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/7
 */

@Data
public class AuthTokens {
    // 访问令牌
    private String accessToken;

    // 刷新令牌
    private String refreshToken;

    // 有效期
    private Long expiresIn;
}
