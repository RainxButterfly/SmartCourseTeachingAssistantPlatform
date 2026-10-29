package com.course.backend.modules.course.mapper;

import com.course.backend.modules.course.dto.response.SemesterOptionVO;
import com.course.backend.modules.course.entity.Course;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * <p>
 * 课程 Mapper 接口
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-16
 */
public interface CourseMapper extends BaseMapper<Course> {

    /**
     * 学期字典：按学期分组计数，倒序返回。
     *
     * <p>⚠️ 两个契约硬要求（PAD §7.2 / openapi /courses/semesters）：
     * <ul>
     *   <li><b>必须过滤空学期</b> {@code semester <> ''}，未填学期的课程不进字典；</li>
     *   <li>按学期倒序，最近的在前。</li>
     * </ul>
     *
     * <p>注意：这里显式写 {@code is_deleted = 0}。手写 SQL **不会**被 MyBatis-Plus 的
     * 逻辑删除自动追加条件，所有自定义 SQL 都必须自己排除软删行。
     */
    @Select("""
            SELECT semester AS value, COUNT(*) AS course_count
            FROM t_course
            WHERE is_deleted = 0 AND semester <> ''
            GROUP BY semester
            ORDER BY semester DESC
            """)
    List<SemesterOptionVO> selectSemesterOptions();
}
