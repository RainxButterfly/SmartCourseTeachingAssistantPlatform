package com.course.backend.modules.course.dto.response;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 课程详情 = CourseVO 全部字段（平铺）+ stats（openapi 写死）。
 *
 * <p>⚠️ 必须**继承** CourseVO，而不是包一层 `courseVO` 属性：
 * 前端 CourseDetailSchema 是 `CourseSchema.extend({ stats })`，字段都在顶层。
 *
 * <p>⚠️ CourseVO 带 @Builder，而 Lombok 的 @Builder **不会继承父类字段**，
 * 所以构建 CourseDetailVO 请用 setter，不要用 builder。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@EqualsAndHashCode(callSuper = true)
@Data
public class CourseDetailVO extends CourseVO {
    /** 课程统计概览；契约要求必填非空对象 */
    private CourseStatsVO stats;
}
