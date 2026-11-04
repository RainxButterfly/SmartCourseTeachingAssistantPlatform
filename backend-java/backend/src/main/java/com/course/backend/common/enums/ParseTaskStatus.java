package com.course.backend.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/4
 */

@Getter
@RequiredArgsConstructor
public enum ParseTaskStatus {
    QUEUED("QUEUED"),
    RUNNING("RUNNING"),
    SUCCESS("SUCCESS"),
    FAILED("FAILED");

    @JsonValue
    @EnumValue
    @Schema(description = "解析任务状态")
    private final String value;
}
