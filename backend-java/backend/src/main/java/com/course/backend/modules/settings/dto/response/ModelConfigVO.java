package com.course.backend.modules.settings.dto.response;

import com.course.backend.common.enums.ModelProvider;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Accessors(chain = true)
public class ModelConfigVO {

    @Schema(description = "厂商预设；CUSTOM 表示任意 OpenAI 兼容端点", example = "DEEPSEEK")
    private ModelProvider provider;

    @JsonProperty("base_url")
    @Schema(description = "API 地址（OpenAI 兼容端点，通常以 /v1 结尾）", example = "https://api.deepseek.com/v1")
    private String baseUrl;

    @Schema(description = "模型名", example = "deepseek-chat")
    private String model;

    @JsonProperty("api_key_masked")
    @Schema(description = "密钥掩码，如 sk-****f3a1；未配置时为 \"\"", example = "sk-****f3a1")
    private String apiKeyMasked;

    @JsonProperty("has_api_key")
    @Schema(description = "是否已配置密钥", example = "true")
    private boolean hasApiKey;

    @JsonProperty("updated_at")
    @Schema(description = "更新时间", example = "2026-10-02T21:40:00")
    private String updatedAt;
}
