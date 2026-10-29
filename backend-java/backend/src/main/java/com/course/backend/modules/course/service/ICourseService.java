package com.course.backend.modules.course.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.response.PageResult;
import com.course.backend.modules.course.dto.request.CourseDTO;
import com.course.backend.modules.course.dto.request.CourseQueryRequest;
import com.course.backend.modules.course.dto.response.*;
import com.course.backend.modules.course.entity.Course;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.validation.Valid;

/**
 * <p>
 * 课程 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-16
 */
public interface ICourseService extends IService<Course> {

    ApiResponse<PageResult<CourseVO>> queryCoursePage(@Valid CourseQueryRequest request);

    ApiResponse<CourseVO> createCourse(@Valid CourseDTO courseDTO);

    ApiResponse<CodeCheckVO> codeCheck(String code, Long excludeId);

    /** 学期字典：按学期倒序，过滤空学期（GET /courses/semesters） */
    ApiResponse<SemesterListVO> listSemesters();

    ApiResponse<CourseDetailVO> getCourseDetail(Long id);

    ApiResponse<CourseStatsVO> getCourseStats(Long id);

    ApiResponse<DeleteResultVO> deleteCourse(Long id, boolean cascade);

    ApiResponse<CourseVO> updateCourse(Long id, @Valid CourseDTO courseDTO);

    Course getCourseById(Long id);
}
