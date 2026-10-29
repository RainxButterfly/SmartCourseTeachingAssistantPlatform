package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Python AI 服务调用配置
 * 对应 application.yml 中的 course.ai.python.*
 * （PAD §2 v0.15：Java → Python 用 RestClient + 虚拟线程，不引 OpenFeign；超时 30s、重试 1 次）
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.ai.python")
public class PythonProperties {

    /** Python AI 服务根地址，如 http://192.168.150.104:8000 */
    private String baseUrl;

    /** 建立连接超时 */
    private Duration connectTimeout = Duration.ofSeconds(5);

    /** 读取响应超时（PAD 写死 30s） */
    private Duration readTimeout = Duration.ofSeconds(30);

    /** 失败重试次数（PAD 写死 1 次；SSE 流式调用不应重试，见 infra/ai 调用层） */
    private int retry = 1;

}
