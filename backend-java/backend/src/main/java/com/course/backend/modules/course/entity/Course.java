package com.course.backend.modules.course.entity;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;

import com.course.backend.common.enums.CourseVisibility;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 课程
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-16
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_course")
public class Course implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 课程 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 课程名称，2-50 字
     */
    @TableField("name")
    private String name;

    /**
     * 课程编号，2-32 位字母/数字/下划线/中划线，全局唯一
     */
    @TableField("code")
    private String code;

    /**
     * 学期，可空串（空学期的课程不进学期字典）
     */
    @TableField("semester")
    private String semester;

    /**
     * 任课教师
     */
    @TableField("teacher")
    private String teacher;

    /**
     * 封面主题色，6 位 HEX
     */
    @TableField("color")
    private String color;

    /**
     * 课程简介
     */
    @TableField("description")
    private String description;

    /**
     * 可见性：PRIVATE=仅自己 PUBLIC=全部可见
     */
    @TableField("visibility")
    private CourseVisibility visibility;

    /**
     * 创建者用户 ID
     */
    @TableField("owner_id")
    private Long ownerId;

    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 软删：false=正常 true=已删
     * 属性名必须是 deleted，才能匹配 yml 的 logic-delete-field: deleted
     */
    @TableField("is_deleted")
    private Boolean deleted;


}
