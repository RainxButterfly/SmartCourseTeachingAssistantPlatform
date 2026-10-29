package com.course.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * RedisTemplate 配置。
 *
 * <p>为什么需要这个配置类：
 * <ul>
 *   <li><b>连接本身不用配</b>：yml 里 spring.data.redis.* 配好后，Spring Boot 自动装配
 *       {@code RedisConnectionFactory}（含 Lettuce 连接池）；</li>
 *   <li><b>但默认的 {@code RedisTemplate<String,Object>} 用的是 JDK 序列化</b>：
 *       key 是 {@code \xAC\xED\x00\x05...} 乱码，value 是不可读的二进制。
 *       存进 Redis 里既没法用 redis-cli 排查，换语言/工具也没法解析。所以这里重新
 *       声明一个「key 用 String、value 用 JSON」的模板覆盖默认行为。</li>
 * </ul>
 *
 * <p>代码里直接注入的 {@code StringRedisTemplate} 是 Spring Boot 另配的一个模板
 * （key/value 都已是 String），两个 Bean 可以共存，互不影响。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // key / hash 的 key 用 String：Redis 里可读
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);

        // value / hash 的 value 用 JSON：可读 + 可跨语言解析
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        // 必须调用：完成内部初始化（否则运行时 serializer 为 null 报错）
        template.afterPropertiesSet();
        return template;
    }
}
