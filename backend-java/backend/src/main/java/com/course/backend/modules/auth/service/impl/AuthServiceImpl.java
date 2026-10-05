package com.course.backend.modules.auth.service.impl;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.RegisterRequest;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.course.backend.modules.auth.entity.User;
import com.course.backend.modules.auth.mapper.AuthMapper;
import com.course.backend.modules.auth.service.AuthService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 用户 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
@Service
public class AuthServiceImpl extends ServiceImpl<AuthMapper, User> implements AuthService {

    /**
     * 注册
     * @param registerRequest 注册请求
     * @return 注册结果
     */
    @Override
    public ApiResponse<LoginResponse> register(RegisterRequest registerRequest) {

        return null;
    }
}
