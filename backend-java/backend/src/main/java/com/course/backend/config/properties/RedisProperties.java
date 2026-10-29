package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Redis 业务配置属性（非 Spring Data Redis 连接配置，是业务自定义的 key 前缀与 TTL）
 * 对应配置文件 redis.* 前缀
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.redis")
public class RedisProperties {
    /** Redis key 统一前缀，用于业务 key 命名空间隔离，如 "course:" 防止与其他系统 key 冲突 */
    private String keyPrefix;

    /** 幂等 key 过期时间（秒），默认 300（5 分钟），用于防重复提交、接口幂等校验等场景 */
    private int idempotentTtl;
}
