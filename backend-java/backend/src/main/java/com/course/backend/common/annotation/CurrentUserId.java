package com.course.backend.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 自动注入当前登录用户ID，仅用于 Controller 方法参数
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {
}
