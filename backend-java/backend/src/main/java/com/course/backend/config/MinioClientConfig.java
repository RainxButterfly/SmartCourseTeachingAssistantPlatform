package com.course.backend.config;

import com.course.backend.config.properties.MinioProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;

/**
 * MinIO 客户端配置。
 *
 * <p>为什么需要这个配置类：MinIO 是第三方客户端库（非 Spring Boot starter），
 * <b>没有自动装配</b>，MinioClient 必须由我们手动 new 出来并注册成 Bean，
 * 业务代码才能通过构造器注入使用。yml 里配的 course.storage.minio.* 只是「原料」，
 * 由 {@link MinioProperties} 读取后喂给这里。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class MinioClientConfig {

    private final MinioProperties minioProperties;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();
    }

    /**
     * 应用就绪后按 auto-create-bucket 配置建桶。
     *
     * <p>⚠️ @EventListener 的坑：方法参数 = 要监听的事件类型，不是依赖注入。
     * 所以这里参数写 {@code MinioClient} 会被 Spring 当成「监听 MinioClient 事件」，
     * 与真正发布的 {@link ApplicationReadyEvent} 类型不匹配而报错。
     * 正确写法：注解 value 指定事件类型 + 方法无参；需要 client 时直接调用 {@link #minioClient()}
     * （@Configuration 走 CGLIB 代理，同配置类内互调会返回同一个单例 bean）。
     *
     * <p>建桶失败只记 warn，不阻断应用启动（MinIO 之后可用时 presign 时会再报）。
     */
    @EventListener(ApplicationReadyEvent.class)
    public void createBucketIfMissing() {
        if (Boolean.FALSE.equals(minioProperties.getAutoCreateBucket())) {
            return;
        }
        try {
            String bucket = minioProperties.getBucket();
            boolean exists = minioClient().bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient().makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("MinIO 桶已创建：{}", bucket);
            }
        } catch (Exception e) {
            log.warn("MinIO 建桶检查失败（不影响启动）：{}", e.getMessage());
        }
    }
}
