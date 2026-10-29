package com.course.backend.modules.course.dto.response;

import com.course.backend.common.enums.CourseVisibility;
import jdk.jshell.Snippet;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CourseVO {
    // 课程 ID
    private Long id;

    // 课程名称，2-50 字
    private String name;

    // 课程编号，2-32 位字母/数字/下划线/中划线，全局唯一
    private String code;

    // 学期，最长 20 字；未填为空串
    private String semester;

    // 任课教师，最长 50 字；未填为空串
    private String teacher;

    // 封面主题色，6 位 HEX
    private String color;

    // 课程简介，最长 200 字；未填为空串
    private String description;

    // 可见性。PRIVATE=仅自己可见；PUBLIC=列表中对所有人可见
    private CourseVisibility visibility;

    // 创建者用户 ID
    private Long ownerId;

    // 创建者用户名
    private String ownerName;

    // 课程下的资料数量
    private Integer materialCount;

    // 课程下的会话数量
    private Integer conversationCount;

    // 最近活跃时间；从未活跃为 null
    private String lastActiveAt;

    // 创建时间
    private String createdAt;

    // 更新时间
    private String updatedAt;
}
