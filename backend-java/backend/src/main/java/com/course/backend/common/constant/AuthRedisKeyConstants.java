package com.course.backend.common.constant;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */
public final class AuthRedisKeyConstants {
    /** 忘记密码-验证码缓存，TTL 300s */
    public static final String PWD_RESET_CODE  = "pwd_reset:code:%s";

    /** 忘记密码-发送节流，TTL 60s */
    public static final String PWD_RESET_THROTTLE = "pwd_reset:throttle:%s";

    /** 用户令牌缓存，TTL 7天 */
    public static final String USER_TOKENS = "user_tokens:%d"; // %d = userId

    private AuthRedisKeyConstants() {};
}
