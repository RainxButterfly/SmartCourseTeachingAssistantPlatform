package com.course.backend.modules.course.controller;


import com.course.backend.common.annotation.CurrentUserId;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.response.PageResult;
import com.course.backend.modules.course.dto.request.CourseDTO;
import com.course.backend.modules.course.dto.request.CourseQueryRequest;
import com.course.backend.modules.course.dto.response.*;
import com.course.backend.modules.course.service.ICourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

/**
 * <p>
 * 课程 前端控制器
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-16
 */
@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@Tag(name = "课程模块", description = "课程分页、新建课程、课程详情等")
public class CourseController {
    private final ICourseService courseService;

    @GetMapping
    @Operation(summary = "课程分页列表", description = "支持关键词、归属（我的/全部）、学期、排序筛选。列表页筛选状态会同步到 URL query（搜索词 replace、离散筛选与翻页 push）。")
    public ApiResponse<PageResult<CourseVO>> queryCoursePage(
            @Valid @ParameterObject CourseQueryRequest request) {
        return courseService.queryCoursePage(request);
    }

    @PostMapping
    @Operation(summary = "新建课程", description = "新建课程，课程编号全局唯一，重复返回 1005。")
    public ApiResponse<CourseVO> createCourse(@Valid @RequestBody CourseDTO courseDTO) {
        return courseService.createCourse(courseDTO);
    }

    @GetMapping("/check-code")
    @Operation(summary = "课程编号唯一性预检", description = "available=false 时携带冲突课程，供前端给出「该课程编号已被《操作系统》占用」这类精准提示。")
    public ApiResponse<CodeCheckVO> codeCheck(@RequestParam(required = true, name = "code") String code,
                                              @RequestParam(required = false, name = "exclude_id") Long excludeId) {
        return courseService.codeCheck(code, excludeId);
    }

    @GetMapping("/semesters")
    @Operation(summary = "学期字典", description = "供课程筛选与表单下拉使用，按学期倒序（最近的在前）；已过滤空学期。")
    public ApiResponse<SemesterListVO> listSemesters() {
        return courseService.listSemesters();
    }

    /**
     * ⚠️ 路径变量限定为纯数字：否则 /courses/semesters、/courses/xxx 这类字面量路径
     * 会被本方法吞掉，Spring 试图把 "semesters" 转成 Long 直接抛类型转换异常。
     */
    @GetMapping("/{id:\\d+}")
    @Operation(summary = "课程详情（含统计概览）", description = "课程详情页，包含课程信息、教师信息、课程评价、课程统计概览等。")
    public ApiResponse<CourseDetailVO> getCourseDetail(@PathVariable("id") Long id) {
        return courseService.getCourseDetail(id);
    }

    @GetMapping("/{id:\\d+}/stats")
    @Operation(summary = "单课程统计", description = "单课程统计，包含资料总数、会话总数等")
    public ApiResponse<CourseStatsVO> getCourseStats(@PathVariable("id") Long id) {
        return courseService.getCourseStats(id);
    }

    @DeleteMapping("/{id:\\d+}")
    @Operation(summary = "删除课程", description = "课程下仍有资料或会话时返回 1006（HTTP 409），且 data 携带子资源数量，供前端弹二次确认；带 cascade=true 再删则连同子资源一起删除。\n" +
            "\n" +
            "删除课程需异步补偿清理 MinIO 对象与 Milvus 向量（MQ 投递，失败进重试队列）。")
    public ApiResponse<DeleteResultVO> deleteCourse(@PathVariable("id") Long id,
                                                    @RequestParam(required = false, defaultValue = "false", name = "cascade") boolean cascade) {
        return courseService.deleteCourse(id, cascade);
    }

    @PutMapping("/{id}")
    @Operation(summary = "更新课程", description = "请求体与新建一致（全量覆盖）。课程编号重复返回 1005。")
    public ApiResponse<CourseVO> updateCourse(@PathVariable("id") Long id, @Valid @RequestBody CourseDTO courseDTO) {
        return courseService.updateCourse(id, courseDTO);
    }
}
