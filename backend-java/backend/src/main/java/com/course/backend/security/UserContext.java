package com.course.backend.security;

import cn.hutool.system.UserInfo;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;

/**
 * 当前登录用户上下文。
 * 通过 ThreadLocal 保存，只在一次请求内有效。
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */
public class UserContext {
    private UserContext() {}

        private static final ThreadLocal<Long> HOLDER = new ThreadLocal<>();

    // 设置当前用户
    public static void set(Long userId) {
        HOLDER.set(userId);
    }

    // 获取当前用户，可能为null（未登录）
    public static Long get() {
        return HOLDER.get();
    }

    /**
     * 获取当前用户，未登录时抛 BizException
     * 适合在 Controller/Service 里强制要求登录的场景使用
     */
    public static Long getRequired() {
        Long userId = HOLDER.get();
        if (userId == null) {
            throw new BizException(ErrorCode.NO_PERMISSION);
        }
        return userId;
    }

    // 清理用户
    public static void clear() {
        HOLDER.remove();
    }
}
