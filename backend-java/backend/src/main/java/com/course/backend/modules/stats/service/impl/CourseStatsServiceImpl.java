package com.course.backend.modules.stats.service.impl;

import com.course.backend.modules.stats.dto.response.CourseStatsSnapshot;
import com.course.backend.modules.stats.mapper.CourseStatsMapper;
import com.course.backend.modules.stats.service.ICourseStatsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * 课程统计实现 —— 当前为「同库 SQL 聚合」。
 *
 * <p>将来微服务化时，本类是实现替换点：把 {@link CourseStatsMapper} 换成
 * 调用其它服务的批量统计接口即可，接口 {@link ICourseStatsService} 与调用方都不变。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseStatsServiceImpl implements ICourseStatsService {

    private final CourseStatsMapper courseStatsMapper;

    @Override
    public CourseStatsSnapshot getCourseStats(Long courseId, Long userId) {
        CourseStatsSnapshot snapshot = courseStatsMapper.selectCourseStats(courseId, userId);
        if (snapshot == null) {
            // SQL 恒返回一行，理论上走不到；兜底防 NPE
            return new CourseStatsSnapshot();
        }

        // AVG 在「无已提交作答」时返回 NULL，而契约要求 quiz_accuracy 必填（0~1）→ 兜底 0。
        // 其余 COUNT(*) 子查询无 GROUP BY 时恒返回 0，不会是 NULL。
        snapshot.setQuizAccuracy(Objects.requireNonNullElse(snapshot.getQuizAccuracy(), 0f));

        // TODO 口径待定：last_active_at 暂返回 null（契约允许），
        //  定稿后在这里接入 t_activity 聚合或冗余列。
        snapshot.setLastActiveAt(null);

        log.debug("课程统计: courseId={}, userId={}, snapshot={}", courseId, userId, snapshot);
        return snapshot;
    }
}
