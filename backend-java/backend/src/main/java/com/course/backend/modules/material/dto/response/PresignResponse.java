package com.course.backend.modules.material.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Accessors(chain = true)
public class PresignResponse {
    @Schema(description = "上传批次号，第三步 complete 需回传")
    private String uploadBatchId;

    @Schema(description = "upload_url 有效期（秒），固定 900")
    private Integer expiresIn;

    @Schema(description = "预签名上传信息")
    private List<PresignItemVO> items;
}
