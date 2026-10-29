package com.course.backend.modules.course.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 课程统计VO
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Data
public class CourseStatsVO {

    @NotNull
    @Schema(description = "资料总数")
    private Integer materialCount;

    @Schema(description = "已完成解析（READY）的资料数")
    @NotNull
    private Integer readyMaterialCount;

    @Schema(description = "会话总数")
    @NotNull
    private Integer conversationCount;

    @Schema(description = "累计提问数")
    @NotNull
    private Integer questionCount;

    @Schema(description = "该课程练习正确率（0~1）")
    @NotNull
    private Float quizAccuracy;

    @Schema(description = "最后活跃时间")
    private String lastActiveAt;
}
