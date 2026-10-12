package com.course.backend.modules.auth.service;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/12
 */
public interface EmailService {
    /**
     * 异步发送重置密码验证码
     */
    void sendResetCodeAsync(String email, String code);
}
