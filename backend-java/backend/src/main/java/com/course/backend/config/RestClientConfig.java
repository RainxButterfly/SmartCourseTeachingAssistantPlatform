package com.course.backend.config;

import com.course.backend.config.properties.PythonProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/**
 * RestClient：Java → Python AI 服务的 HTTP 客户端。
 *
 * <p>为什么需要这个配置类（Spring Boot 自动装配了 RestClient.Builder，但不够用）：
 * <ul>
 *   <li>baseUrl：默认的 Builder 不知道 Python 服务地址，必须显式指定；</li>
 *   <li>超时：默认没有连接/读取超时，PAD 写死读取超时 30s（对应 3002 模型超时）；</li>
 *   <li>重试 1 次：RestClient 本身没有重试机制，且 SSE 流式调用不能盲目重试
 *       （会重复生成内容），所以重试逻辑放在 infra/ai 的调用层，按「普通 JSON 调用可重试 /
 *       SSE 流式调用不可重试」分别处理，这里只负责把 {@link PythonProperties#getRetry()} 读出来。</li>
 * </ul>
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Configuration
@RequiredArgsConstructor
public class RestClientConfig {

    private final PythonProperties pythonProperties;

    @Bean
    public RestClient pythonAiRestClient(RestClient.Builder builder) {
        // 1. 构建带连接超时的 JDK HttpClient（HttpClient 是 JDK 自带，版本无关）
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(pythonProperties.getConnectTimeout())
                .build();

        // 2. 包装成 RestClient 认识的请求工厂，并设读取超时（单位毫秒）
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(pythonProperties.getReadTimeout());

        // 3. 组装 RestClient
        return builder
                .baseUrl(pythonProperties.getBaseUrl())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .requestFactory(requestFactory)
                .build();
    }
}
