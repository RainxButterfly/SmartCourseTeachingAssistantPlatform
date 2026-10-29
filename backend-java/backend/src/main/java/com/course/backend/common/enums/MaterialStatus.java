package com.course.backend.common.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Getter
@RequiredArgsConstructor
public enum MaterialStatus {
    UPLOADING("UPLOADING"),
    PENDING("PENDING"),
    PARSING("PARSING"),
    EMBEDDING("EMBEDDING"),
    READY("READY"),
    FAILED("FAILED");

    @JsonValue
    @EnumValue
    private final String value;
}
