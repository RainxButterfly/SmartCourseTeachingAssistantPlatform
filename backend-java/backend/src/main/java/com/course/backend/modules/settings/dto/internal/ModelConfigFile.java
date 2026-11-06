package com.course.backend.modules.settings.dto.internal;

import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */

@Data
@JsonNaming(PropertyNamingStrategy.SnakeCaseStrategy.class)
public class ModelConfigFile {
    private String provider;
    private String baseUrl;
    private String model;
    private String apiKey;
    private String updatedAt;
}
