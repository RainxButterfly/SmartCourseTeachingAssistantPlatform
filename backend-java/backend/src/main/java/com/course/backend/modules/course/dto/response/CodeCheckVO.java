package com.course.backend.modules.course.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 课程编号唯一性预检响应
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Data
public class CodeCheckVO {
    @Schema(description = "课程编号")
    @NotBlank(message = "课程编号不能为空")
    private String code;

    @Schema(description = "课程编号是否可用，true：可用，false：不可用")
    @NotBlank(message = "课程编号是否可用不能为空")
    private Boolean available;

    @Schema(description = "冲突课程 ID；available=true 时为 null")
    private Long conflictCourseId;

    @Schema(description = "冲突课程名称，用于拼「已被《操作系统》占用」")
    private String conflictCourseName;
}
