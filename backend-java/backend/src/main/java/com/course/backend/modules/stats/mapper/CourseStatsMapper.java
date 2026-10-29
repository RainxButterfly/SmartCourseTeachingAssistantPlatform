package com.course.backend.modules.stats.mapper;

import com.course.backend.modules.stats.dto.response.CourseStatsSnapshot;
import org.apache.ibatis.annotations.Param;

/**
 * 跨模块统计 Mapper（stats 模块专用）。
 *
 * <p>为什么统计查询不放在 {@code CourseMapper}：
 * 统计天然横跨 课程 / 资料 / 会话 / 消息 / 答题 五个模块的表。把它收在 stats 模块里，
 * 业务模块只需依赖 {@code ICourseStatsService} 这一层能力接口；
 * 将来拆分微服务时，把本 Mapper 的实现换成「调用其它服务的批量统计接口」即可，
 * 业务模块零改动。
 *
 * <p>注意：本接口不继承 {@code BaseMapper}，因为它没有对应实体 —— 只返回聚合结果。
 * 启动类 {@code @MapperScan("com.course.backend.modules.**.mapper")} 已覆盖本包。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
public interface CourseStatsMapper {

    /**
     * 一次查询拿到单课程的全部统计指标（多个子查询拼成一行，只走一次网络往返）。
     *
     * @param courseId 课程 ID（调用方需保证课程存在）
     * @param userId   当前登录用户 ID（统计视角 = 我的）
     * @return 统计快照；SQL 恒返回一行，不会为 null
     */
    CourseStatsSnapshot selectCourseStats(@Param("courseId") Long courseId,
                                          @Param("userId") Long userId);
}
