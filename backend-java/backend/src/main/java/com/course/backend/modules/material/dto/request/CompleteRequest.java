package com.course.backend.modules.material.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/28
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CompleteRequest {
    @JsonProperty("upload_batch_id")
    @NotNull
    @Schema(description = "presign 返回的批次号")
    private String uploadBatchId;

    @NotNull
    @Size(min = 1, message = "至少提交 1 个文件")
    @Valid
    @Schema(description = "已成功直传的文件清单")
    private List<CompleteItem> items;
}
