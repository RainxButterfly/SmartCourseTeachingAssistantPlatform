package com.course.backend.modules.material.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/28
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompleteItem {
    @JsonProperty("client_file_id")
    @NotNull
    @Schema(description = "前端临时标识")
    private String clientFileId;

    @JsonProperty("material_id")
    @NotNull
    @Positive
    @Schema(description = "presign 返回的资料 ID")
    private Long materialId;

    @JsonProperty("etag")
    @Schema(description = "MinIO 返回的 etag（可选）")
    private String etag;

    @JsonProperty("sha256")
    @Schema(description = "文件 SHA-256（可选，用于二次校验）")
    private String sha256;
}
