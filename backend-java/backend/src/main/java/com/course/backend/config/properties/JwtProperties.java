package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * JWT 配置绑定类
 * 对应 application.yml 中的 course.jwt.*
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.jwt")
public class JwtProperties {
    // 签名密钥，至少 32 位，生产环境使用环境变量注入
    private String secret;

    // 签发者，JWT payload中的iss字段
    private String issuer;

    // access token有效期 默认2h
    private Duration accessTtl = Duration.ofHours(2);

    // refresh token 有效期 默认7天
    private Duration refreshTtl = Duration.ofDays(7);

    // 时种偏移容错，用于校验过期时间时避免服务器时种误差导致误判
    private Duration clockSkew = Duration.ofSeconds(30);

    // 前端携带token的请求头名称
    private String header = "Authorization";

    // token前缀
    private String tokenPrefix = "Bearer";

    // 是否启用refresh token轮换（每次刷新都签发新的refresh token）
    private Boolean rotate = true;
}
