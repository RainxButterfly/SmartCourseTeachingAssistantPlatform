package com.course.backend.common.util;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

/**
 * 分页工具类
 * 用途：参数规整与 MyBatis-Plus Page 转换
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */

public class PageUtils {
    // 默认页码和页大小
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_SIZE = 10;
    // 最大页大小限制
    private static final int MAX_SIZE = 50;

    /**
     * 规整分页参数并转换为 MP Page 对象（默认 size=10 的兜底）
     * @param page 前端传入页码（规整为 >= 1）
     * @param size 前端传入页大小（规整为 <= 50）
     */
    public static <T> Page<T> toMpPage(Integer page, Integer size) {
        return toMpPage(page, size, DEFAULT_SIZE);
    }

    /**
     * 规整分页参数并转换为 MP Page 对象（支持按契约指定默认 size）
     * @param page 前端传入页码（null/<1 规整为 1）
     * @param size 前端传入页大小（null/<1 规整为 defaultSize；>50 截断为 50）
     * @param defaultSize 契约里该接口的默认页大小（如课程列表 12、资料列表 10、消息 50）
     */
    public static <T> Page<T> toMpPage(Integer page, Integer size, int defaultSize) {
        if (page == null || page < 1) {
            page = DEFAULT_PAGE;
        }
        if (size == null || size < 1) {
            size = defaultSize;
        }
        if (size > MAX_SIZE) {
            size = MAX_SIZE; // 契约： size <= 50
        }
        return new Page<>(page, size);
    }

    /**
     * 统一分页请求 DTO（业务子类继承后补各自的筛选字段）。
     * 字段刻意<b>不预置默认值</b>：每个接口的默认 size 由契约决定且各不相同
     * （课程 12 / 资料 10 / 消息 50），统一交给 {@link #toMpPage(Integer, Integer, int)} 处理，
     * 避免继承时父类默认值写死。
     */
    @Getter
    @Setter
    public static class PageQueryDTO {
        @Schema(description = "页码，默认 1")
        private Integer page;

        @Schema(description = "页大小，默认值见各接口契约")
        private Integer size;
    }
}
