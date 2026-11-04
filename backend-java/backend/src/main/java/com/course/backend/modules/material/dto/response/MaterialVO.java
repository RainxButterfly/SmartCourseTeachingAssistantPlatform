package com.course.backend.modules.material.dto.response;

import com.course.backend.common.enums.MaterialStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/30
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MaterialVO {

    @Schema(description = "资料 ID")
    private Long id;

    @JsonProperty("course_id")
    @Schema(description = "所属课程 ID")
    private Long courseId;

    @Size(max = 255, message = "展示名（可被重命名）不能超过 255 个字符")
    @Schema(description = "展示名（可被重命名）")
    private String name;

    @JsonProperty("original_name")
    @Schema(description = "上传时的原始文件名，不可修改")
    private String originalName;

    @JsonProperty("object_key")
    @Schema(description = "对象存储的键，不可修改")
    private String objectKey;

    @JsonProperty("size_bytes")
    @Schema(description = "文件字节数")
    private Long sizeBytes;

    @JsonProperty("page_count")
    @Schema(description = "页数（解析后回填），未解析为 0")
    private Integer pageCount;

    @Schema(description = "文件格式")
    private String format;

    @Schema(description = "资料状态机：上传中 → 待解析 → 解析中 → 向量化中 → 已完成 / 失败")
    private MaterialStatus status;

    @JsonProperty("error_msg")
    @Schema(description = "错误信息")
    private String errorMsg;

    @Schema(description = "版本号，从 1 开始（重新上传或重新解析递增）")
    private Integer version;

    @JsonProperty("chunk_count")
    @Schema(description = "切片数（向量化完成后回填）")
    private Integer chunkCount;

    @JsonProperty("uploaded_by")
    @Schema(description = "上传者用户 ID")
    private Long uploadedBy;

    @JsonProperty("uploaded_by_name")
    @Schema(description = "上传者用户名")
    private String uploadedByName;

    @JsonProperty("created_at")
    @Schema(description = "创建时间")
    private String createdAt;

    @JsonProperty("sha256")
    @Schema(description = "文件 SHA-256（用于秒传/去重），未提供为 null")
    private String sha256;

    @JsonProperty("upload_batch_id")
    @Schema(description = "所属上传批次号（同一次 presign 的多个文件共享）")
    private String uploadBatchId;
}
