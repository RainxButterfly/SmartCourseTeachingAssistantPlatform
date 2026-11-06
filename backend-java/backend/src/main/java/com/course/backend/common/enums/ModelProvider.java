package com.course.backend.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */

@Getter
@RequiredArgsConstructor
public enum ModelProvider {
    DEEPSEEK("DEEPSEEK"),
    OPENAI("OPENAI"),
    QWEN("QWEN"),
    CUSTOM("CUSTOM");

    @JsonValue
    @EnumValue
    @Schema(description = "模型提供者")
    private final String value;
}
