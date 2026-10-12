package com.course.backend.modules.auth.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.RandomUtil;
import com.course.backend.common.constant.AuthRedisKeyConstants;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.auth.dto.request.*;
import com.course.backend.modules.auth.dto.response.AuthTokens;
import com.course.backend.modules.auth.dto.response.LoginResponse;
import com.course.backend.modules.auth.mapper.AuthMapper;
import com.course.backend.modules.auth.service.EmailService;
import com.course.backend.modules.auth.service.IAuthService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.course.backend.modules.auth.service.ITokenBlacklistService;
import com.course.backend.modules.auth.vo.UserVO;
import com.course.backend.modules.auth.entity.User;
import com.course.backend.security.JwtService;
import com.course.backend.security.PasswordService;
import com.course.backend.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;

import static com.course.backend.common.constant.AuthRedisKeyConstants.*;

/**
 * <p>
 * 用户 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl extends ServiceImpl<AuthMapper, User> implements IAuthService {
    private final PasswordService passwordService;
    private final JwtService jwtService;
    private final ITokenBlacklistService tokenBlacklistService;
    // redis
    private final StringRedisTemplate redisTemplate;
    // 发信服务
    private final EmailService emailService;

    /**
     * 注册
     * @param registerRequest 注册请求
     * @return 注册结果
     */
    @Override
    public ApiResponse<LoginResponse> register(RegisterRequest registerRequest) {
        // 1. 邮箱唯一性
        String email = registerRequest.getEmail();
        String password = registerRequest.getPassword();
        User oldUser = lambdaQuery()
                .eq(User::getEmail, email)
                .one();
        if (oldUser != null) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT, "邮箱已存在！");
        }

        // 2. 密码强度校验
        passwordService.validateStrength(password);

        // 3. 密码加密
        String hash = passwordService.hash(password);

        // 4. 存储用户信息
        User newUser = BeanUtil.copyProperties(registerRequest, User.class);
        newUser.setPasswordHash(hash);
        newUser.setAvatar(null);
        newUser.setStatus(1);
        newUser.setIsDeleted(false);
        save(newUser);

        // 5. 生成登录凭证
        return ApiResponse.ok(generateLoginCredentials(newUser));
    }

    @Override
    public ApiResponse<LoginResponse> login(LoginRequest loginRequest) {
        User user = lambdaQuery()
                .eq(User::getEmail, loginRequest.getEmail())
                .one();
        if (user == null) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "邮箱或密码错误");
        }
        boolean matches = passwordService.matches(loginRequest.getPassword(), user.getPasswordHash());
        if (!matches) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN, "邮箱或密码错误");
        }
        LoginResponse loginResponse = generateLoginCredentials(user);
        return ApiResponse.ok(loginResponse);
    }

    @Override
    public ApiResponse<AuthTokens> refreshToken(RefreshTokenRequest refreshTokenRequest) {
        // 1. 查询黑名单是否存在token
        String refreshToken = refreshTokenRequest.getRefreshToken();
        String jti = jwtService.extractJti(refreshToken);
        LocalDateTime tokenExpiration = jwtService.extractExpirationAsLocalDateTime(refreshToken);
        boolean existJti = tokenBlacklistService.checkExistJti(jti);
        if (existJti) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
        }

        // 2. 生成新的token
        JwtService.TokenPair token = jwtService.refreshAccessToken(refreshTokenRequest.getRefreshToken());

        // 3. 旧的token写入token名单表
        boolean isAdded = tokenBlacklistService.addTokenToBlacklist(jti, tokenExpiration);
        if (!isAdded) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
        }

        // 4. 组装并返回
        AuthTokens authTokens = new AuthTokens();
        authTokens.setAccessToken(token.accessToken());
        authTokens.setRefreshToken(token.refreshToken());
        authTokens.setExpiresIn(jwtService.getAccessTokenExpireSeconds());

        // 5. 缓存refresh token
        String newJti = jwtService.extractJti(token.refreshToken());
        Long userId = UserContext.get();
        String userTokenKey = String.format(AuthRedisKeyConstants.USER_TOKENS, userId);
        redisTemplate.opsForSet().add(userTokenKey, newJti);
        redisTemplate.expire(userTokenKey, Duration.ofDays(30));
        redisTemplate.opsForSet().remove(userTokenKey, jti);

        return ApiResponse.ok(authTokens);
    }

    @Override
    public void logout(String accessToken, String refreshToken) {
        // 1. 吊销accessToken存入黑名单
        if (accessToken != null && !accessToken.isBlank()) {
            String jti = jwtService.extractJti(accessToken);
            if (jti != null) {
                LocalDateTime localDateTime = jwtService.extractExpirationAsLocalDateTime(accessToken);
                tokenBlacklistService.addTokenToBlacklist(jti, localDateTime);
            }
        }

        // 2. 吊销refreshToken并存入黑名单
        if(refreshToken != null && !refreshToken.isBlank()) {
            String jti = jwtService.extractJti(refreshToken);
            if (jti != null) {
                LocalDateTime localDateTime = jwtService.extractExpirationAsLocalDateTime(refreshToken);
                tokenBlacklistService.addTokenToBlacklist(jti, localDateTime);
            }
        }

        // 3. 缓存中删除
        String refreshJti = jwtService.extractJti(refreshToken);
        String userTokenKey = String.format(AuthRedisKeyConstants.USER_TOKENS, UserContext.get());
        redisTemplate.opsForSet().remove(userTokenKey, refreshJti);
    }

    @Override
    public ApiResponse<UserVO> getMe(String token) {
        // 转化为纯净token
        token = jwtService.resolveBearerToken(token);
        // 解析token并获取userId
        Long userId = jwtService.extractUserId(token);
        // 获取用户信息
        User user = getById(userId);
        UserVO userVO = BeanUtil.copyProperties(user, UserVO.class);
        return ApiResponse.ok(userVO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Void> changePassword(ChangePasswordRequest request, String token) {
        // 1. 获取旧密码和新密码
        String oldPassword = request.getOldPassword();
        String newPassword = request.getNewPassword();
        // 2. 获取用户
        Long userId = UserContext.get();
        User user = getById(userId);
        if (user == null || user.getIsDeleted()) {
            throw new BizException(ErrorCode.INVALID_OR_EXPIRED_TOKEN);
        }
        // 3. 比对旧密码是否正确
        boolean pwdMatches = passwordService.matches(oldPassword, user.getPasswordHash());
        if (!pwdMatches) {
            throw new BizException(ErrorCode.OLD_PASSWORD_ERROR);
        }

        // 4. 校验新密码的密码强度
        passwordService.validateStrength(newPassword);

        // 5. 吊销token
        String accessToken = jwtService.resolveBearerToken(token);
        String jti = jwtService.extractJti(accessToken);
        LocalDateTime localDateTime = jwtService.extractExpirationAsLocalDateTime(accessToken);
        tokenBlacklistService.addTokenToBlacklist(jti, localDateTime);

        // 6. 更新数据库
        user.setPasswordHash(passwordService.hash(newPassword));
        updateById(user);

        // 7. 返回成功
        return ApiResponse.ok();
    }

    @Override
    public void sendResetCode(ForgotPasswordRequest request) {
        // 1. 获取邮箱
        String email = request.getEmail();

        // 2. 节流：同一邮箱60s内不能重复请求
        String throttle = String.format(PWD_RESET_THROTTLE, email);
        if (redisTemplate.hasKey(throttle)) {
            return;
        }

        // 3 邮箱是否存在
        Long count = lambdaQuery()
                .eq(User::getEmail, email)
                .count();

        // 3.1 不存在 直接 返回
        if (count == 0) return;

        // 3.2 存在 -> 生成、缓存、发信验证码
        String code = generateCode(6);
        String codeKey = String.format(PWD_RESET_CODE, code);
        redisTemplate.opsForValue()
                .set(codeKey, code, Duration.ofSeconds(300));
        redisTemplate.opsForValue()
                .set(throttle, "1", Duration.ofSeconds(60));

        emailService.sendResetCodeAsync(email, code);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request,  String token) {
        // 1. 邮箱是否已注册
        // 1.1 未注册 返回1008
        String email = request.getEmail();
        User user = lambdaQuery()
                .eq(User::getEmail, email)
                .one();
        if (user == null || user.getIsDeleted()) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        // 2. 验证验证码是否正确
        // 2.1 不正确或过期 返回1008
        String code = request.getCode();
        String codeKey = String.format(PWD_RESET_CODE, code);
        if (!redisTemplate.hasKey(codeKey)) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        // 3. 密码强度是否符合要求以及判断密码是不是旧密码
        String oldPwd = user.getPasswordHash();
        String password = request.getPassword();
        if (passwordService.matches(password, oldPwd)) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID, "新密码不能和原密码一样");
        }
        passwordService.validateStrength(password);

        // 4. 更新密码
        user.setPasswordHash(passwordService.hash(password));
        updateById(user);

        // 5. 吊销该用户全部refresh token和验证码报废
        Boolean codeDeleted = redisTemplate.delete(codeKey);
        if (!codeDeleted) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        String userTokenKey = String.format(USER_TOKENS, user.getId());
        Set<String> jtis = redisTemplate.opsForSet().members(userTokenKey);

        if (jtis != null && !jtis.isEmpty()) {
            for (String jti : jtis) {
                String jtiKey = "jti:" + jti;
                long ttl = redisTemplate.getExpire(jtiKey);
                if (ttl > 0) {
                    LocalDateTime expiry = LocalDateTime.now().plusSeconds(ttl);
                    tokenBlacklistService.addTokenToBlacklist(jti, expiry);
                }
            }
        }

    }

    // 生成验证码
    private String generateCode(int count) {
        return RandomUtil.randomNumbers(count);
    }

    // 生成登录凭证
    private LoginResponse generateLoginCredentials(User user) {
        UserVO userVO = BeanUtil.copyProperties(user, UserVO.class);
        String accessToken = jwtService.generateAccessToken(user.getId());
        String refreshToken = jwtService.generateRefreshToken(user.getId());

        // 缓存登录凭证
        String jti = jwtService.extractJti(refreshToken);
        String userTokenKey = String.format(USER_TOKENS, user.getId());

        redisTemplate.opsForSet().add(userTokenKey, jti);
        redisTemplate.expire(userTokenKey, Duration.ofDays(30));

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setAccessToken(accessToken);
        loginResponse.setRefreshToken(refreshToken);
        loginResponse.setExpiresIn(jwtService.getAccessTokenExpireSeconds());
        loginResponse.setUser(userVO);
        return loginResponse;
    }
}
