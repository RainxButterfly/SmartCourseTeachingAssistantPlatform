package com.course.backend.common.constant;

import com.course.backend.config.properties.RedisProperties;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */
public interface RedisKeys {
    /** 忘记密码-验证码缓存，TTL 300s；%s = 邮箱（契约写死「键含邮箱」，校验时按邮箱取） */
    String PWD_RESET_CODE  = "pwd_reset:code:%s";

    /** 忘记密码-发送节流，TTL 60s；%s = 邮箱 */
    String PWD_RESET_THROTTLE = "pwd_reset:throttle:%s";

    /** 忘记密码-单邮箱单日发送计数，TTL 1 天；%s = 邮箱，%s = 日期(2026-10-16) */
    String PWD_RESET_DAILY_COUNT = "pwd_reset:daily:%s:%s";

    /** 用户令牌缓存，TTL 7天 */
    String USER_TOKENS = "user_tokens:%d"; // %d = userId

    /** 课程幂等键 */
    String COURSE_IDEM = "idem:%s";

}
