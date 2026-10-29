package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * CORS 跨域配置属性
 * 对应配置文件 course.cors.* 前缀
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.cors")
public class CorsProperties {
    /** 是否启用 CORS（默认 true） */
    private Boolean enabled;

    /** 允许的源列表，生产环境严禁写 *（需与 allow-credentials 配合） */
    private List<String> allowedOrigins;

    /** 允许的 HTTP 方法，逗号分隔 */
    private List<String> allowedMethods;

    /** 允许的请求头，* 表示全部 */
    private String allowedHeaders;

    /** 暴露给前端的响应头（前端 JS 可读取） */
    private String exposedHeaders;

    /** 是否允许携带凭证（Cookie/Authorization），true 时 allowed-origins 不能为 * */
    private boolean allowCredentials = true;

    /** 预检请求缓存时间（秒），期间同源请求不再发 OPTIONS 预检 */
    private long maxAge = 3600;
}
