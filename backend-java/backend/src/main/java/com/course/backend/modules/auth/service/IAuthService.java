package com.course.backend.modules.auth.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.*;
import com.course.backend.modules.auth.dto.response.AuthTokens;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.baomidou.mybatisplus.extension.service.IService;
import com.course.backend.modules.auth.vo.UserVO;
import com.course.backend.modules.auth.entity.User;
import jakarta.validation.Valid;

/**
 * <p>
 * 用户 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
public interface IAuthService extends IService<User> {

    /**
     * 注册
     * @param registerRequest 注册请求
     * @return 注册响应
     */
    ApiResponse<LoginResponse> register(RegisterRequest registerRequest);

    /**
     * 登录
     * @param loginRequest 登录请求
     * @return 登录响应
     */
    ApiResponse<LoginResponse> login(@Valid LoginRequest loginRequest);

    /**
     * 刷新令牌
     * @param refreshTokenRequest 刷新令牌请求
     * @return 刷新令牌响应
     */
    ApiResponse<AuthTokens> refreshToken(RefreshTokenRequest refreshTokenRequest);

    /**
     * 登出
     * @param accessToken 访问令牌
     * @param refreshToken 刷新令牌
     */
    void logout(String accessToken, String refreshToken);

    /**
     * 获取当前用户信息
     * @param token 访问令牌
     * @return 用户信息
     */
    ApiResponse<UserVO> getMe(String token);

    /**
     * 修改密码
     * @param request 修改密码请求
     * @return 修改密码响应
     */
    ApiResponse<Void> changePassword(@Valid ChangePasswordRequest request, String token);

    /**
     * 发送重置密码验证码
     * @param request 重置密码请求
     */
    void sendResetCode(ForgotPasswordRequest request);

    /**
     * 重置密码
     * @param request 重置密码请求
     */
    void resetPassword(@Valid ResetPasswordRequest request,  String token);
}
