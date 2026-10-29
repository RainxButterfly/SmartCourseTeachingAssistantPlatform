package com.course.backend.modules.material.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.http.HttpMethod;

import java.util.Map;

/**
 * 预签名上传凭证ItemVO
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Accessors(chain = true)
public class PresignItemVO {

    @Schema(description = "回显请求里的临时标识ID")
    private String clientFileId;

    @Schema(description = "后端预分配的资料 ID（此时 t_material.status=UPLOADING）")
    private Long materialId;

    @Schema(description = "MinIO 对象键（第三步 complete 校验用）")
    private String objectKey;

    @Schema(description = "预签名 PUT URL，前端直接 PUT 该地址（不走 Gateway）")
    private String uploadUrl;

    @Schema(description = "HTTP 方法，前端直接 PUT 该地址（不走 Gateway）")
    @Builder.Default
    private String method = "PUT";

    @Schema(description = "直传时必须原样携带的请求头（如 Content-Type）")
    private Map<String, String> headers;

    @Schema(description = "允许的最大字节数，固定 52428800（50MB）")
    @Builder.Default
    private Long maxSizeBytes = 52428800L;
}
