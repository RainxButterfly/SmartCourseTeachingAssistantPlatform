package com.course.backend.modules.course.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 学期字典项（契约 SemesterOption）。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SemesterOptionVO {

    /** 学期值，如 2026秋 */
    @Schema(description = "学期值", example = "2026秋")
    private String value;

    /** 该学期下的课程数，0 可用于禁用选项 */
    @Schema(description = "该学期下的课程数", example = "4")
    private Integer courseCount;
}
