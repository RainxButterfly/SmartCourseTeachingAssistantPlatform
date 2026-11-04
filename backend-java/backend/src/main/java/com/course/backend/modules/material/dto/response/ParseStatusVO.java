package com.course.backend.modules.material.dto.response;

import com.course.backend.common.enums.ParseTaskStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

import java.time.LocalDateTime;

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
public class ParseStatusVO {

    @JsonProperty("task_id")
    @Schema(description = "解析任务 ID", example = "101")
    private Long taskId;

    @JsonProperty("material_id")
    @Schema(description = "素材 ID", example = "1")
    private Long materialId;

    @JsonProperty("status")
    @Schema(description = "解析任务状态", example = "RUNNING")
    private ParseTaskStatus status;

    @JsonProperty("progress")
    @Schema(description = "进度百分比（0-100）", example = "80")
    private Integer progress;

    @JsonProperty("total_chunks")
    @Schema(description = "切片总数（解析完成后回填）", example = "320")
    private Integer totalChunks;

    @JsonProperty("indexed_chunks")
    @Schema(description = "已向量化的切片数", example = "208")
    private Integer indexedChunks;

    @JsonProperty("stage")
    @Schema(description = "展示用阶段文案，如「向量化中」", example = "向量化中")
    private String stage;

    @JsonProperty("error_msg")
    @Schema(description = "失败原因；成功或进行中为 null", example = "null")
    private String errorMsg;

    @JsonProperty("started_at")
    @Schema(description = "开始时间；未开始为 null", example = "2026-10-02T10:00:00")
    private String startedAt;

    @JsonProperty("finished_at")
    @Schema(description = "结束时间；未结束为 null", example = "null")
    private String finishedAt;
}
