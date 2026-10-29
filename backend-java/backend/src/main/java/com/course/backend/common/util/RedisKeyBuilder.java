package com.course.backend.common.util;

import com.course.backend.common.constant.RedisKeys;
import com.course.backend.config.properties.RedisProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Component
@RequiredArgsConstructor
public class RedisKeyBuilder {
    private final RedisProperties redisProperties;

    // ==================== 课程模块 ====================

    /** 课程幂等 key → course:idem:{requestId} */
    public String courseIdem(String requestId) {
        return redisProperties.getKeyPrefix() + String.format(RedisKeys.COURSE_IDEM, requestId);
    }

    // ==================== 认证模块 ====================

    /** 忘记密码-验证码 → pwd_reset:code:{email} */
    public String pwdResetCode(String email) {
        return String.format(RedisKeys.PWD_RESET_CODE, email);
    }

    /** 忘记密码-节流 → pwd_reset:throttle:{email} */
    public String pwdResetThrottle(String email) {
        return String.format(RedisKeys.PWD_RESET_THROTTLE, email);
    }

    /** 忘记密码-每日计数 → pwd_reset:daily:{email}:{date} */
    public String pwdResetDailyCount(String email, String date) {
        return String.format(RedisKeys.PWD_RESET_DAILY_COUNT, email, date);
    }

    // ==================== 用户模块 ====================

    /** 用户令牌 Set → user_tokens:{userId} */
    public String userTokens(Long userId) {
        return String.format(RedisKeys.USER_TOKENS, userId);
    }

    /** 单个 jti 黑名单 key → jti:{jti} */
    public String jtiBlacklist(String jti) {
        return "jti:" + jti;
    }
}
