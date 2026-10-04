package com.course.backend.security;

import com.course.backend.common.annotation.CurrentUserId;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import org.jetbrains.annotations.Nullable;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Component
public class CurrentUserIdArgumentResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        // 只处理带 @CurrentUserId 注解，且类型为 Long 或 long 的参数
        if (!parameter.hasParameterAnnotation(CurrentUserId.class)) {
            return false;
        }
        Class<?> type = parameter.getParameterType();
        return Long.class.isAssignableFrom(type) || "long".equals(type.getName());
    }

    @Nullable
    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  @Nullable ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  @Nullable WebDataBinderFactory binderFactory) throws Exception {
        Long userId = UserContext.get();
        if (userId == null) {
            // 理论上被 AuthInterceptor 拦截的接口都会先 set；这里再兜底防漏配
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
        }
        return userId;
    }
}
