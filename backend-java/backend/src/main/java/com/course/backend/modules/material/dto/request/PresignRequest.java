package com.course.backend.modules.material.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 预签名请求
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PresignRequest {

    @Schema(description = "目标课程 ID")
    @Positive
    @NotNull
    @JsonProperty("course_id")
    private Long courseId;

    @Schema(description = "待上传文件清单，单次最多 10 个")
    @Size(min = 1, max = 10, message = "单次最多上传 10 个文件")
    @Valid
    @NotNull
    private List<PresignFileItem> files;
}
