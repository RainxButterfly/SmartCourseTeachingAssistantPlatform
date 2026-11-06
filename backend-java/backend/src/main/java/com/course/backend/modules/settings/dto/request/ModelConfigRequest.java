package com.course.backend.modules.settings.dto.request;

import com.course.backend.common.enums.ModelProvider;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
public class ModelConfigRequest {

    @NotNull
    @Schema(description = "厂商预设", example = "DEEPSEEK")
    private ModelProvider provider;

    @NotBlank(message = "API 地址不能为空")
    @Size(max = 300, message = "API 地址不能超过 300 字")
    @Schema(description = "API 地址，必须为合法 URL，不超过 300 字", example = "https://api.deepseek.com/v1")
    private String baseUrl;

    @NotBlank(message = "模型名不能为空")
    @Size(max = 100, message = "模型名不能超过 100 字")
    @Schema(description = "模型名，1-100 字", example = "deepseek-chat")
    private String model;

    @Size(max = 200, message = "API Key 不能超过 200 字")
    @Schema(description = "API Key；省略或传空串表示保留已保存的密钥", example = "sk-xxxxxxxxxxxxxxxxxxxxxxxx")
    private String apiKey;
}
