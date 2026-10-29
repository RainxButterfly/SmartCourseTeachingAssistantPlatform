package com.course.backend.modules.activity.service.impl;

import com.course.backend.common.constant.ActivityConstants;
import com.course.backend.common.enums.ActivityType;
import com.course.backend.modules.activity.entity.Activity;
import com.course.backend.modules.activity.mapper.ActivityMapper;
import com.course.backend.modules.activity.service.IActivityService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 活动流 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-20
 */
@Service
public class ActivityServiceImpl extends ServiceImpl<ActivityMapper, Activity> implements IActivityService {

    @Override
    public void recordCourseCreated(Long userId, Long courseId, String courseName) {
        ActivityType type = ActivityType.COURSE_CREATED;
        Activity activity = new Activity()
                .setUserId(userId)
                .setType(type.getValue())
                .setTargetType(type.getTargetType())
                .setTargetId(String.valueOf(courseId))
                .setTitle(String.format(ActivityConstants.TITLE_COURSE_CREATED, courseName))
                .setDeleted(false);
        save(activity);
    }

    @Override
    public Activity queryActivityByCourseId(Long courseId) {
        return lambdaQuery()
                .eq(Activity::getTargetId, courseId)
                .groupBy(Activity::getTargetId)
                .orderByDesc(Activity::getUpdatedAt)
                .last("limit 1")
                .one();

    }
}
