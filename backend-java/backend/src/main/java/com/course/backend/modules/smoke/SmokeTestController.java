package com.course.backend.modules.smoke;

import com.course.backend.common.annotation.CurrentUserId;
import com.course.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 冒烟测试
 * @author StarLeaf-Roxy
 * @since 2026/10/6
 */

@RestController
@RequiredArgsConstructor
public class SmokeTestController {
    private final JwtService jwtService;

    @GetMapping("/demo/ping")
    public Map<String, String> ping() {
        return Map.of("message", "pong");
    }

    @GetMapping("/demo/token")
    public Map<String, String> token(@RequestParam(defaultValue = "1") Long userId) {
        return Map.of("accessToken", jwtService.generateAccessToken(userId));
    }

    @GetMapping("/secure/me")
    public Map<String, Long> me(@CurrentUserId Long userId) {
        return Map.of("userId", userId);
    }
}
