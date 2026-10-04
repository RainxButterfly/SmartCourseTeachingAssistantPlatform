package com.course.backend.security;

import cn.hutool.crypto.digest.BCrypt;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * 密码服务：哈希、校验、强度校验
 * @author StarLeaf-Roxy
 * @since 2026/10/4
 */

@Service
public class PasswordService {
    // 密码最小长度
    private static final int MIN_LENGTH = 8;

    private static final Pattern UPPER_CASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWER_CASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    /**
     * 生成密码哈希（BCrypt 自动加盐）
     */
    public String hash(String rawPassword) {
        String salt = BCrypt.gensalt();
        return BCrypt.hashpw(rawPassword, salt);
    }

    /**
     * 校验明文密码与哈希是否匹配
     */
    public boolean matches(String rawPassword, String hashedPassword) {
        return BCrypt.checkpw(rawPassword, hashedPassword);
    }

    /**
     * 校验密码强度：至少 8 位，且包含大写字母、小写字母和数字
     * 不满足直接抛异常，由全局异常处理器统一返回
     */
    public void validateStrength(String rawPassword) {
        if (rawPassword == null || rawPassword.length() < MIN_LENGTH
            || !UPPER_CASE.matcher(rawPassword).find()
            || !LOWER_CASE.matcher(rawPassword).find()
            || !DIGIT.matcher(rawPassword).find()
        ) {
            throw new BizException(ErrorCode.PARAM_ERROR,
                    "密码必须至少" + MIN_LENGTH + "位，且包含大写字母、小写字母和数字");
        }
    }
}
