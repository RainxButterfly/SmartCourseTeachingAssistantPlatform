package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * MinIO 对象存储配置
 * 对应 application.yml 中的 course.storage.minio.*
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.storage.minio")
public class MinioProperties {

    /** MinIO 服务地址（后端签名/删除用） */
    private String endpoint;

    /** 对外地址（预签名 URL 里展示给前端直传/下载用的，通常与 endpoint 相同） */
    private String publicEndpoint;

    /** 访问密钥 */
    private String accessKey;

    /** 秘密密钥 */
    private String secretKey;

    /** 桶名 */
    private String bucket;

    /** 预签名 URL 有效期（秒），契约写死 900 */
    private Integer presignExpireSeconds = 900;

    /** 启动时自动建桶 */
    private Boolean autoCreateBucket = true;
}
