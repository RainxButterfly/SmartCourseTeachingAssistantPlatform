package com.course.backend.modules.course.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.course.backend.common.enums.CourseSort;
import com.course.backend.common.enums.CourseVisibility;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.response.PageResult;
import com.course.backend.common.util.DateTimeUtils;
import com.course.backend.common.util.PageUtils;
import com.course.backend.modules.activity.service.IActivityService;
import com.course.backend.modules.auth.entity.User;
import com.course.backend.modules.auth.service.IAuthService;
import com.course.backend.modules.conversation.service.IConversationService;
import com.course.backend.modules.course.dto.request.CourseDTO;
import com.course.backend.modules.course.dto.request.CourseQueryRequest;
import com.course.backend.modules.course.dto.response.*;
import com.course.backend.modules.course.entity.Course;
import com.course.backend.modules.course.mapper.CourseMapper;
import com.course.backend.modules.course.service.ICourseService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.course.backend.modules.material.service.IMaterialService;
import com.course.backend.modules.stats.dto.response.CourseStatsSnapshot;
import com.course.backend.modules.stats.service.ICourseStatsService;
import com.course.backend.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * <p>
 * 课程 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-16
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CourseServiceImpl extends ServiceImpl<CourseMapper, Course> implements ICourseService {
    private final CourseMapper courseMapper;
    private final IAuthService authService;
    private final IActivityService activityService;
    /** 统计能力来自 stats 模块（跨模块聚合的唯一出口，便于将来拆服务） */
    private final ICourseStatsService courseStatsService;
    private final IMaterialService materialService;
    private final IConversationService conversationService;

    @Override
    public ApiResponse<PageResult<CourseVO>> queryCoursePage(CourseQueryRequest request) {
        // 1. 排序方式若为空，则设为默认为最近排序
        if (request.getSort() == null || request.getSort().isBlank()) {
            request.setSort(CourseSort.RECENT.getValue());
        }
        // 2. 查询数据
        // ⚠️ 必须用 LambdaQueryWrapper：lambdaQuery() 返回的 ChainWrapper 不能直接传给 selectPage
        //    （MP 解析 SQL 时调用其 getSqlFirst() 会抛 "can not use this method"）
        LambdaQueryWrapper<Course> wrapper = new LambdaQueryWrapper<Course>()
                .eq(request.getMine() != null, Course::getVisibility, Boolean.TRUE.equals(request.getMine()) ? CourseVisibility.PRIVATE : CourseVisibility.PUBLIC)
                .eq(request.getSemester() != null, Course::getSemester, request.getSemester())
                .like(request.getKeyword() != null, Course::getName, request.getKeyword());
        CourseSort courseSort = CourseSort.of(request.getSort());
        if (courseSort != null) {
            switch (courseSort) {
                case NAME -> wrapper.orderByDesc(Course::getName);
                case CREATED -> wrapper.orderByDesc(Course::getCreatedAt);
                case RECENT -> wrapper.orderByDesc(Course::getUpdatedAt);
            }
        }
        // 3. 创建分页对象（page/size 可能为 null，由 PageUtils 规整为契约默认：page=1、size=12）
        Page<Course> pageParam = PageUtils.toMpPage(request.getPage(), request.getSize(), 12);
        int pageNum = (int) pageParam.getCurrent();
        int pageSize = (int) pageParam.getSize();

        // 4. 执行查询
        Page<Course> result = courseMapper.selectPage(pageParam, wrapper);
        if (result.getRecords() == null || result.getRecords().isEmpty()) {
            return ApiResponse.ok(PageResult.empty(pageNum, pageSize));
        }

        // 5. 查询用户名
        List<User> users = authService.getUserByBathIds(
                result.getRecords().stream()
                        .map(Course::getOwnerId)
                        .distinct()
                        .collect(Collectors.toList())
        );

        // 6. 封装vo
        List<CourseVO> list = result.getRecords().stream()
                .map(course -> CourseVO.builder()
                        .id(course.getId())
                        .name(course.getName())
                        .code(course.getCode())
                        .semester(course.getSemester())
                        .teacher(course.getTeacher())
                        .color(course.getColor())
                        .description(course.getDescription())
                        .visibility(course.getVisibility())
                        .ownerId(course.getOwnerId())
                        .ownerName(users.stream()
                                .filter(user -> user.getId()
                                        .equals(course.getOwnerId()))
                                .findFirst().map(User::getUsername)
                                .orElse(""))
                        // TODO 资料模块完成后换成真实统计（批量 GROUP BY course_id，避免 N+1）
                        // 契约要求必填数字，不能给 null，否则前端 Zod 直接判整体响应失败
                        .materialCount(0)
                        // TODO 会话模块完成后换成真实统计
                        .conversationCount(0)
                        // TODO 活动流口径待定；契约允许 null，暂保持
                        .lastActiveAt(DateTimeUtils.toIso8601(course.getUpdatedAt()))
                        .createdAt(DateTimeUtils.toIso8601(course.getCreatedAt()))
                        .updatedAt(DateTimeUtils.toIso8601(course.getUpdatedAt()))
                        .build()
                )
                .toList();

        return ApiResponse.ok(new PageResult<>(list, result.getTotal(), pageNum, pageSize));
    }

    @Override
    @Transactional
    public ApiResponse<CourseVO> createCourse(CourseDTO courseDTO) {
        // 1. 打印日志
        log.info("createCourse: {}", courseDTO);
        // 2. 校验课程代码是否重复
        Long count = lambdaQuery()
                .eq(Course::getCode, courseDTO.getCode())
                .count();
        if (count > 0) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT);
        }
        // 3. 创建课程
        Course course = BeanUtil.copyProperties(courseDTO, Course.class);
        // 4. 获取用户
        Long userId = UserContext.get();
        // 5. 补充数据并保存课程
        course.setOwnerId(userId);
        course.setDeleted(false);
        save(course);
        // 6. 插入活动流
        activityService.recordCourseCreated(userId, course.getId(), course.getName());
        // 7. 组装vo
        CourseVO vo = BeanUtil.copyProperties(course, CourseVO.class);
        User user = authService.getById(userId);
        CourseStatsSnapshot snapshot = courseStatsService.getCourseStats(course.getId(), userId);
        vo.setMaterialCount(snapshot.getMaterialCount());
        vo.setConversationCount(snapshot.getConversationCount());
        vo.setOwnerName(user.getUsername());
        vo.setCreatedAt(DateTimeUtils.toIso8601(course.getCreatedAt()));
        vo.setUpdatedAt(DateTimeUtils.toIso8601(course.getUpdatedAt()));
        // TODO 口径待定：当前用 updated_at 占位（= 创建时间）；定稿后统一改为 t_activity 聚合
        vo.setLastActiveAt(DateTimeUtils.toIso8601(course.getUpdatedAt()));
        log.info("createCourseVO: {}", vo);
        return ApiResponse.ok(vo);
    }

    @Override
    public ApiResponse<CodeCheckVO> codeCheck(String code, Long excludeId) {
        // 1. 查询课程是否存在
        CodeCheckVO vo = new CodeCheckVO();
        Course course = lambdaQuery()
                .eq(Course::getCode, code)
                .ne(excludeId != null, Course::getId, excludeId)
                .one();
        vo.setCode(code);
        // 2. 是否为空
        vo.setAvailable(course == null);
        if (course != null) {
            vo.setConflictCourseId(course.getId());
            vo.setConflictCourseName(course.getName());
        }
        log.info("codeCheck: {}", vo);
        // 3. 返回结果
        return ApiResponse.ok(vo);
    }

    @Override
    public ApiResponse<SemesterListVO> listSemesters() {
        SemesterListVO vo = new SemesterListVO();
        vo.setItems(courseMapper.selectSemesterOptions());
        return ApiResponse.ok(vo);
    }

    @Override
    public ApiResponse<CourseDetailVO> getCourseDetail(Long id) {
        // 1. 查询课程
        Course course = getById(id);
        if (course == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        // 2. 取统计快照（统计视角 = 当前用户；本接口需登录，拦截器已注入 UserContext）
        Long userId = UserContext.getRequired();
        CourseStatsSnapshot snapshot = courseStatsService.getCourseStats(id, userId);

        // 3. 组装 vo（CourseVO 字段平铺 + stats）
        CourseDetailVO vo = new CourseDetailVO();
        BeanUtils.copyProperties(course, vo);
        vo.setOwnerName(authService.getById(course.getOwnerId()).getUsername());
        vo.setCreatedAt(DateTimeUtils.toIso8601(course.getCreatedAt()));
        vo.setUpdatedAt(DateTimeUtils.toIso8601(course.getUpdatedAt()));
        // 顶层三个指标与 stats 保持同一口径，避免同一个页面出现两套数字
        vo.setMaterialCount(snapshot.getMaterialCount());
        vo.setConversationCount(snapshot.getConversationCount());
        vo.setLastActiveAt(snapshot.getLastActiveAt());

        CourseStatsVO stats = toStatsVO(snapshot);
        vo.setStats(stats);

        log.info("课程详情获取: {}", vo);
        return ApiResponse.ok(vo);
    }

    @Override
    public ApiResponse<CourseStatsVO> getCourseStats(Long id) {
        // 1. 课程必须存在（不存在返回 1004）
        if (getById(id) == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        // 2. 统计视角 = 当前用户
        Long userId = UserContext.getRequired();
        CourseStatsSnapshot snapshot = courseStatsService.getCourseStats(id, userId);
        return ApiResponse.ok(toStatsVO(snapshot));
    }

    @Override
    public ApiResponse<DeleteResultVO> deleteCourse(Long id, boolean force) {
        // 1. 获取用户id
        Long userId = UserContext.getRequired();
        // 2. 查询当前课程下有没有关联的资料和会话
        CourseStatsSnapshot snapshot = courseStatsService.getCourseStats(id, userId);
        Integer materialCount = snapshot.getMaterialCount();
        Integer conversationCount = snapshot.getConversationCount();
        if (materialCount > 0 || conversationCount > 0) {
            // 3. 如果有，则看看force是否为true
            if (!force) {
                // 4. force为false，则返回1006
                throw new BizException(ErrorCode.RELATED_DATA_EXIST);
            }
            // 5. force为true 则删除相关的资料+会话 最后课程
            materialService.deleteByCourseId(id);
            conversationService.deleteByCourseId(id);
        }
        // 6. 如果没有，则删除课程
        boolean flag = removeById(id);
        log.info("删除课程结果: {}", flag ? "删除成功" : "删除失败");
        // 7. 返回结果
        return ApiResponse.ok(new DeleteResultVO(id, flag));
    }

    @Override
    public ApiResponse<CourseVO> updateCourse(Long id, CourseDTO courseDTO) {
        // 1. 获取课程
        log.info("updateCourse: {} {}", id, courseDTO);
        Course course = getById(id);
        // 2. 课程为空处理
        if (course == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        // 3. 课程编码不重复
        if (courseDTO.getCode().equals(course.getCode())) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT);
        }
        // 4. 更新课程
        course.setName(courseDTO.getName());
        course.setCode(courseDTO.getCode());
        course.setSemester(courseDTO.getSemester());
        course.setTeacher(courseDTO.getTeacher());
        course.setColor(courseDTO.getColor());
        course.setDescription(courseDTO.getDescription());
        course.setVisibility(courseDTO.getVisibility());
        updateById(course);
        // 5. 组装vo
        CourseVO vo = new CourseVO();
        BeanUtils.copyProperties(course, vo);
        CourseStatsSnapshot snapshot = courseStatsService.getCourseStats(id, UserContext.getRequired());
        vo.setOwnerName(authService.getById(course.getOwnerId()).getUsername());
        vo.setCreatedAt(DateTimeUtils.toIso8601(course.getCreatedAt()));
        vo.setUpdatedAt(DateTimeUtils.toIso8601(course.getUpdatedAt()));
        vo.setMaterialCount(snapshot.getMaterialCount());
        vo.setConversationCount(snapshot.getConversationCount());
        // TODO 口径待定：当前用 updated_at 占位（= 创建时间）；定稿后统一改为 t_activity 聚合
        vo.setLastActiveAt(DateTimeUtils.toIso8601(course.getUpdatedAt()));
        log.info("updateCourseVO: {}", vo);
        return ApiResponse.ok(vo);
    }

    @Override
    public Course getCourseById(Long id) {
        return getById(id);
    }

    /**
     * 内部快照 → 对外契约 VO。
     * 详情接口与单课程统计接口共用，保证两处字段口径完全一致。
     */
    private CourseStatsVO toStatsVO(CourseStatsSnapshot snapshot) {
        CourseStatsVO stats = new CourseStatsVO();
        stats.setMaterialCount(snapshot.getMaterialCount());
        stats.setReadyMaterialCount(snapshot.getReadyMaterialCount());
        stats.setConversationCount(snapshot.getConversationCount());
        stats.setQuestionCount(snapshot.getQuestionCount());
        stats.setQuizAccuracy(snapshot.getQuizAccuracy());
        stats.setLastActiveAt(snapshot.getLastActiveAt());
        return stats;
    }
}
