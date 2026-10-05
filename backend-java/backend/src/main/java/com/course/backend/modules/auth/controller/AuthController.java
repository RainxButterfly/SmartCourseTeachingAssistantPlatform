package com.course.backend.modules.auth.controller;


import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.RegisterRequest;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.course.backend.modules.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

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
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<LoginResponse> register(@RequestBody RegisterRequest registerRequest) {
        return authService.register(registerRequest);
    }
}
