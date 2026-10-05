package com.course.backend.modules.auth.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.RegisterRequest;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.course.backend.modules.auth.entity.User;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 用户 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
public interface AuthService extends IService<User> {

    /**
     * 注册
     * @param registerRequest
     * @return
     */
    ApiResponse<LoginResponse> register(RegisterRequest registerRequest);
}
