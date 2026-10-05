package com.course.backend.modules.auth.dto.response;

import com.course.backend.modules.auth.vo.UserVO;
import lombok.Data;

/**
 * 注册+登录统一响应类
 * @author StarLeaf-Roxy
 * @since 2026/10/6
 */

@Data
public class LoginResponse {
    // 访问令牌
    private String accessToken;
    // 刷新令牌
    private String refreshToken;
    // 有效期
    private Integer expiresIn;
    // 用户信息
    private UserVO userVO;
}
