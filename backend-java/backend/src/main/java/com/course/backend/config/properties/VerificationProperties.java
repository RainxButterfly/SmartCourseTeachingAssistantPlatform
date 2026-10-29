package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.verification")
public class VerificationProperties {
    /** 验证码长度（纯数字），默认 6 位 */
    private int codeLength = 6;

    /** 验证码有效期（秒），默认 300（5 分钟），对应 Redis 中验证码 key 的 TTL */
    private int ttl = 300;

    /** 重发间隔（秒），默认 60，对应 Redis 节流 key pwd_reset:throttle:{email} 的 TTL */
    private int resendInterval = 60;

    /** 单邮箱每日发送上限，默认 10 次，防刷限流 */
    private int maxSendPerDay = 10;

    /** 是否掩码未找到错误（防枚举攻击），true 时验证码不存在也返回统一提示，对应 resetPassword 防枚举统一抛 1008 */
    private boolean maskNotFound = true;
}
