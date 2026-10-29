package com.course.backend.config.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * AI / 大模型配置属性
 * 对应配置文件 ai.* 前缀
 * 注：Milvus 向量库连接参数由 Python AI 服务管理，Java 侧只做业务编排与持久化
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Component
@ConfigurationProperties(prefix = "course.ai")
public class AiProperties {
    /** 模型配置文件路径，支持环境变量 AI_CONFIG_FILE 注入，默认 ./config/model-config.local.yml */
    private String configFile;

    /** BYOK 加密密钥（AES-256），支持环境变量 AI_ENCRYPT_KEY 注入，生产环境必须更换 */
    private String encryptKey;

    /** 默认模型供应商，如 openai-compatible */
    private String defaultProvider = "openai-compatible";

    /** 未配置大模型时返回的错误码，对应 ErrorCode.AI_NOT_CONFIGURED(3004) */
    private int disabledCode = 3004;

    /** 对话相关配置 */
    private Chat chat = new Chat();

    @Data
    public static class Chat {
        /** 最大上下文消息条数（含历史），控制发送给模型的 messages 数组长度 */
        private int maxContextMessages = 20;

        /** 用户输入最大字符数，超出截断或拒绝 */
        private int maxInputChars = 8000;

        /** 单次对话请求超时时间 */
        private Duration requestTimeout = Duration.ofSeconds(120);

        /** 流式输出相关配置 */
        private Stream stream = new Stream();

        @Data
        public static class Stream {
            /** SSE 心跳间隔，防止代理/网关断连 */
            private Duration keepAliveInterval = Duration.ofSeconds(15);

            /** 流式输出最大持续时间，超时强制终止 */
            private Duration maxDuration = Duration.ofSeconds(300);
        }
    }
}
