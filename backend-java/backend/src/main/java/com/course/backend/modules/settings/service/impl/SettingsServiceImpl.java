package com.course.backend.modules.settings.service.impl;

import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.enums.ModelProvider;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.util.DateTimeUtils;
import com.course.backend.config.properties.AiProperties;
import com.course.backend.modules.settings.dto.request.ModelConfigRequest;
import com.course.backend.modules.settings.dto.response.ModelConfigVO;
import com.course.backend.modules.settings.dto.internal.ModelConfigFile;
import com.course.backend.modules.settings.dto.response.ModelTestVO;
import com.course.backend.modules.settings.service.ISettingsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.File;
import java.io.IOException;
import java.net.http.HttpClient;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.course.backend.common.constant.SettingsConstant.CONNECT_TIMEOUT;
import static com.course.backend.common.constant.SettingsConstant.READ_TIMEOUT;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsServiceImpl implements ISettingsService {
    private static final ObjectMapper YAML = new ObjectMapper(new YAMLFactory());
    private final AiProperties aiProperties;

    @Override
    public ApiResponse<ModelConfigVO> getModelConfig() {
        // 1. 读取配置文件
        ModelConfigFile modelConfigFile = readConfigFile();
        // 2. 转换vo并且返回
        return ApiResponse.ok(toVO(modelConfigFile));
    }

    @Override
    public ApiResponse<ModelConfigVO> saveModelConfig(ModelConfigRequest request) {
        // 1. 读旧配置
        ModelConfigFile existing = readConfigFile();

        // 2. 合并：文件不存在时新建；api_key 为空表示保留旧密钥
        ModelConfigFile target = existing == null ? new ModelConfigFile() : existing;
        target.setProvider(request.getProvider().getValue());
        target.setBaseUrl(request.getBaseUrl());
        target.setModel(request.getModel());
        if (request.getApiKey() != null && !request.getApiKey().isBlank()) {
            target.setApiKey(request.getApiKey());
        }
        target.setUpdatedAt(DateTimeUtils.toIso8601(LocalDateTime.now()));

        // 3. 写文件
        writeConfigFile(target);

        // 4. 返回掩码后的 VO
        return ApiResponse.ok(toVO(target));
    }

    @Override
    public ApiResponse<ModelTestVO> testConnection(ModelConfigRequest request) {
        // 1. 读配置，如果传过来了就用新的
        String apiKey = request.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            ModelConfigFile modelConfigFile = readConfigFile();
            apiKey = modelConfigFile == null ? null : modelConfigFile.getApiKey();
        }

        // 没有 → 返回 ok=false「尚未配置」
        if (apiKey == null || apiKey.isBlank()) {
            return ApiResponse.ok(new ModelTestVO(false, 0L, "尚未配置 API Key"));
        }
        // 2. 用 RestClient 调 {base_url}/chat/completions，带 max_tokens=1 的最小请求
        String baseUrl = request.getBaseUrl();
        Map<String, Object> body = Map.of(
                "model", request.getModel(),
                "messages", List.of(Map.of("role", "user", "content", "ping")),
                "max_tokens", 1
        );
        long startTime = System.currentTimeMillis();
        try {
            // 3. 成功 → ok=true + latency_ms
            buildClient(baseUrl).post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            long latency = System.currentTimeMillis() - startTime;
            return ApiResponse.ok(new ModelTestVO(true, latency,
                    "连接成功，模型 " + request.getModel() + " 可用"));
            // 4. 失败/超时 → 仍返回 200，ok=false + message
        } catch (RestClientResponseException e) {
            // 4xx / 5xx：key 无效、地址错、模型名不存在
            long latency = System.currentTimeMillis() - startTime;
            String detail = brief(e.getResponseBodyAsString());
            return ApiResponse.ok(new ModelTestVO(false, latency,
                    "HTTP " + e.getStatusCode().value() + ": " + detail));
        } catch (ResourceAccessException e) {
            // 连接超时 / DNS 解析失败 / 拒绝连接
            long latency = System.currentTimeMillis() - startTime;
            return ApiResponse.ok(new ModelTestVO(false, latency,
                    "连接失败：" + e.getMostSpecificCause().getMessage()));
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - startTime;
            return ApiResponse.ok(new ModelTestVO(false, latency, "测试失败：" + e.getMessage()));
        }
    }

    private String brief(String text) {
        if (text == null || text.isBlank()) return "无响应内容";
        return text.length() > 200 ? text.substring(0, 200) + "..." : text;
    }

    // 创建RestClient客户端（单独建，全局是请求Python的）
    private RestClient buildClient(String baseUrl) {
        HttpClient httpclient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpclient);
        factory.setReadTimeout(READ_TIMEOUT);
        return RestClient.builder()
                .baseUrl(baseUrl.replaceAll("/+$", "")) // 去掉尾部斜杠，避免拼接出 //
                .requestFactory(factory)
                .build();
    }

    // 写入配置文件
    private void writeConfigFile(ModelConfigFile config) {
        File file = new File(aiProperties.getConfigFile());
        File parent = file.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            log.error("创建配置目录失败: {}", parent.getAbsolutePath());
            throw new BizException(ErrorCode.INTERNAL_ERROR, "创建配置目录失败");
        }
        try {
            YAML.writeValue(file, config);
        } catch (IOException e) {
            log.error("写入大模型配置失败： {}", file.getAbsolutePath(), e);
            throw new BizException(ErrorCode.INTERNAL_ERROR, "写入配置失败");
        }
    }

    // 读取配置文件
    private ModelConfigFile readConfigFile() {
        File file = new File(aiProperties.getConfigFile());
        if (!file.exists()) {
            return null;
        }
        try {
            return YAML.readValue(file, ModelConfigFile.class);
        } catch (IOException e) {
            log.error("读取大模型配置失败： {}", file.getAbsolutePath(), e);
            throw new BizException(ErrorCode.INTERNAL_ERROR, "读取配置失败");
        }
    }

    // 转换 VO
    private ModelConfigVO toVO(ModelConfigFile file) {
        ModelConfigVO vo = new ModelConfigVO();
        if (file == null) {
            vo.setProvider(parseProvider(aiProperties.getDefaultProvider()));
            vo.setModel("");
            vo.setBaseUrl("");
            vo.setHasApiKey(false);
            vo.setApiKeyMasked("");
            vo.setUpdatedAt(null);
            return vo;
        }

        vo.setProvider(parseProvider(file.getProvider()));
        vo.setBaseUrl(file.getBaseUrl());
        vo.setModel(file.getModel());

        String apiKey = file.getApiKey();
        boolean hasKey = apiKey != null && !apiKey.isBlank();
        vo.setHasApiKey(hasKey);
        vo.setApiKeyMasked(hasKey ? mask(apiKey) : "");
        vo.setUpdatedAt(parseIsoOrNull(file.getUpdatedAt()));
        return vo;
    }

    /** 配置文件里的 provider 可能为空或被手工改坏，非法值一律回退到 CUSTOM */
    private ModelProvider parseProvider(String value) {
        if (value == null || value.isBlank()) {
            return ModelProvider.CUSTOM;
        }
        try {
            return ModelProvider.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            log.warn("配置文件 provider 非法，已回退 CUSTOM: {}", value);
            return ModelProvider.CUSTOM;
        }
    }

    /** 配置文件可能被手工改过，时间格式异常时返回 null，而非让整个接口 500 */
    private String parseIsoOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return DateTimeUtils.toIso8601(LocalDateTime.parse(value));
        } catch (DateTimeParseException e) {
            log.warn("配置文件 updated_at 格式不合法，已忽略: {}", value);
            return null;
        }
    }

    private String mask(String apiKey) {
        if (apiKey.length() < 8) return "****";
        return apiKey.substring(0, 3) + "****"
                + apiKey.substring(apiKey.length() - 4);
    }
}
