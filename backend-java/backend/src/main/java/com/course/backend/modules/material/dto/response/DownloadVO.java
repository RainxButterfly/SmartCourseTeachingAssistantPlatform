package com.course.backend.modules.material.dto.response;

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
 * @since 2026/11/4
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Accessors(chain = true)
public class DownloadVO {

    @JsonProperty("material_id")
    @Schema(description = "资料 ID", example = "1")
    private Long materialId;

    @JsonProperty("url")
    @Schema(description = "预签名 GET URL，前端直接跳转/下载", example = "https://minio.internal/sc-ta/course/1/...&X-Amz-Signature=...")
    private String url;

    @JsonProperty("file_name")
    @Schema(description = "下载时的文件名", example = "第3章 内存管理.pdf")
    private String fileName;

    @JsonProperty("expires_in")
    @Schema(description = "URL 有效期（秒），固定 900", example = "900")
    @Builder.Default
    private Integer expiresIn = 900;
}
