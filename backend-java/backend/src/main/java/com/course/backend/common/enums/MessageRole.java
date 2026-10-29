package com.course.backend.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Getter
@RequiredArgsConstructor
public enum MessageRole {
    USER("USER"),
    ASSISTANT("ASSISTANT"),
    SYSTEM("SYSTEM");

    @JsonValue
    @EnumValue
    @Schema(description = "角色")
    private final String value;
}
