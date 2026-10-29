package com.course.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 课程列表排序（PAD §7.2 / openapi GET /courses 写死：recent|name|created）。
 *
 * <p>⚠️ 角色说明：它<b>不是</b>用来直接绑定 query 参数的 —— query 绑定走 ConversionService
 * 按枚举名 valueOf（大小写敏感），{@code sort=recent} 匹配不到枚举常量 {@code RECENT}。
 * 正确用法：DTO 里 sort 用 String 接收，service 层调 {@link #of(String)} 解析 + 校验，
 * 然后在这里把「契约值」翻译成「排序字段/方向」。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
@Getter
@RequiredArgsConstructor
public enum CourseSort {
    /** 最近活跃（实现口径：最近更新，契约未写死） */
    RECENT("recent"),
    /** 名称升序 */
    NAME("name"),
    /** 创建时间倒序 */
    CREATED("created");

    /** 契约里的 query 值（全小写） */
    private final String value;

    /**
     * 按契约值解析枚举。
     * @param value query 传入的 sort 值；null 返回契约默认 {@link #RECENT}
     * @return 匹配的枚举；非法值返回 null（由调用方决定抛 1001）
     */
    public static CourseSort of(String value) {
        if (value == null) {
            return RECENT;
        }
        for (CourseSort sort : values()) {
            if (sort.value.equals(value)) {
                return sort;
            }
        }
        return null;
    }
}
