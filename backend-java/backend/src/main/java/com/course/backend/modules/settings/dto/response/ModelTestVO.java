package com.course.backend.modules.settings.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
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
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ModelTestVO {

    @Schema(description = "是否连通", example = "true")
    private boolean ok;

    @JsonProperty("latency_ms")
    @Schema(description = "探活耗时（毫秒）", example = "186")
    private Long latencyMs;

    @Schema(description = "可读结果文案（成功含模型名；失败给出 Key 无效 / 地址不可达 / 模型不存在等原因）",
            example = "连接成功，模型 deepseek-chat 可用")
    private String message;
}
