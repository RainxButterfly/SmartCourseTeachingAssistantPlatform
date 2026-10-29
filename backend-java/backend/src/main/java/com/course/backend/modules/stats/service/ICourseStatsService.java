package com.course.backend.modules.stats.service;

import com.course.backend.modules.stats.dto.response.CourseStatsSnapshot;

/**
 * 课程统计能力接口 —— 业务模块访问统计数据的**唯一入口**。
 *
 * <p>设计意图（为微服务化预留）：course 模块只依赖本接口，不关心数据从哪来。
 * 现在是「同库 SQL 聚合」；将来拆服务时换成「调用 conversation/material 服务的批量统计接口」，
 * 本接口签名不变，course 模块零改动。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
public interface ICourseStatsService {

    /**
     * 取单课程统计快照（当前用户视角）。
     *
     * @param courseId 课程 ID；**调用方负责校验课程存在**（不存在应已抛 1004），本方法不重复查课程
     * @param userId   当前登录用户 ID
     * @return 统计快照，字段保证非空（无数据时数字为 0）
     */
    CourseStatsSnapshot getCourseStats(Long courseId, Long userId);
}
