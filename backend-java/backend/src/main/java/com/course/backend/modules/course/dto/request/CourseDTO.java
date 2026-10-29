package com.course.backend.modules.course.dto.request;

import com.course.backend.common.enums.CourseVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@AllArgsConstructor
@NoArgsConstructor
@Data
public class CourseDTO {
    // 课程名称，2-50 字
    @NotBlank
    @Size(min = 2, max = 50)
    private String name;

    // 课程编号，2-32 位字母/数字/下划线/中划线，全局唯一
    @NotBlank
    @Size(min = 2, max = 32)
    private String code;

    // 学期
    private String semester;

    // 任课教师
    private String teacher;

    // 封面主题色
    private String color;

    // 课程简介，不超过 200 字
    @Size(max = 200)
    private String description;

    // 可见性
    private CourseVisibility visibility;
}
