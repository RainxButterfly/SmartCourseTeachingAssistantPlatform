package com.course.backend.modules.auth.controller;


import com.course.backend.common.annotation.PublicApi;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.*;
import com.course.backend.modules.auth.dto.response.AuthTokens;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.course.backend.modules.auth.service.IAuthService;
import com.course.backend.modules.auth.vo.UserVO;
import com.course.backend.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.stream.Collectors;

/**
 * <p>
 * 用户 前端控制器
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "鉴权模块", description = "注册/登录/刷新/登出/改密等")
public class AuthController {
    private final IAuthService authService;
    private final JwtService jwtService;

    @PublicApi
    @PostMapping("/register")
    @Operation(summary = "用户注册", description = "邮箱唯一，密码强度≥8且含大小写数字")
    public ApiResponse<LoginResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        return authService.register(registerRequest);
    }

    @PublicApi
    @PostMapping("/login")
    @Operation(summary = "用户登录", description = "邮箱或密码错误一律返回 1002，不区分「邮箱不存在」与「密码错误」，避免账号枚举。")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return authService.login(loginRequest);
    }

    @PublicApi
    @PostMapping("/refresh")
    @Operation(summary = "刷新令牌", description = "刷新令牌，返回新的访问令牌和刷新令牌")
    public ApiResponse<AuthTokens> refreshToken(@RequestBody RefreshTokenRequest refreshTokenRequest) {
        return authService.refreshToken(refreshTokenRequest);
    }

    @PostMapping("/logout")
    @Operation(summary = "用户登出", description = "吊销当前 access_token 和传入的 refresh_token")
    public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest logoutRequest,
                                    HttpServletRequest httpRequest) {
        // 1. 从header从取出 Access Token
        String accessToken = jwtService.resolveBearerToken(httpRequest.getHeader("Authorization"));

        // 2. 从请求体取出 Refresh Token
        String refreshToken = logoutRequest.getRefreshToken();

        // 3. 调用service层处理黑名单逻辑
        authService.logout(accessToken, refreshToken);

        // 4. 成功返回， data为null
        return ApiResponse.ok();
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前用户信息", description = "需要登录")
    public ApiResponse<UserVO> getMe(@RequestHeader("Authorization") String token) {
        return authService.getMe(token);
    }

    @PutMapping("/password")
    @Operation(summary = "修改密码", description = "需要登录")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                            @RequestHeader("Authorization") String token) {
        return authService.changePassword(request, token);
    }

    @PublicApi
    @PostMapping("/forgot-password")
    @Operation(summary = "忘记密码第一步", description = "发送验证码，无论邮箱是否存在，都返回成功")
    public ApiResponse<Void> sendResetCode(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.sendResetCode(request);
        return ApiResponse.ok();
    }

    @PublicApi
    @PostMapping("/reset-password")
    @Operation(summary = "忘记密码第二步", description = "凭邮箱 + 6 位验证码重置密码，无需登录")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok();
    }
}
