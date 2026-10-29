package com.course.backend.modules.material.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 预签名文件项
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PresignFileItem {

    @Schema(description = "前端本次上传的临时标识，用于把 presign 结果与本地 File 对上")
    @Size(max = 64)
    @NotNull
    @JsonProperty("client_file_id")
    private String clientFileId;

    @Schema(description = "原始文件名（含扩展名，用于推断格式）")
    @Size(max = 255)
    @NotNull
    @JsonProperty("original_name")
    private String originalName;

    @Schema(description = "文件字节数，单文件上限 52428800（50MB）；超限返回 2001")
    @Positive
    @NotNull
    @JsonProperty("size_bytes")
    private Long sizeBytes;

    @Schema(description = "文件 MIME 类型，会原样写入预签名头的 Content-Type")
    @NotNull
    @JsonProperty("content_type")
    private String contentType;

    @Schema(description = "文件 SHA-256（可选，用于秒传/去重）")
    @Size(min = 64, max = 64, message = "sha256 必须是 64 位十六进制字符串")
    private String sha256;
}
