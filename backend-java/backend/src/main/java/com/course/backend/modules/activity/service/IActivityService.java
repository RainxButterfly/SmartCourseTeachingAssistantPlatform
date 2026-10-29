package com.course.backend.modules.activity.service;

import com.course.backend.modules.activity.entity.Activity;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 活动流 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-20
 */
public interface IActivityService extends IService<Activity> {
    /**
     * 创建课程 → 写一条 COURSE_CREATED 活动。
     * 必须在业务事务内调用（PAD §8 写死）。
     */
    void recordCourseCreated(Long userId, Long courseId, String courseName);

    /**
     * 根据课程ID查询活动流
     * @param courseId 课程ID
     */
    Activity queryActivityByCourseId(Long courseId);
}
