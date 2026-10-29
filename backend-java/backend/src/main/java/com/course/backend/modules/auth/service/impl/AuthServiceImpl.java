package com.course.backend.modules.auth.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.RandomUtil;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.util.RedisKeyBuilder;
import com.course.backend.config.properties.VerificationProperties;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

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
    // 验证码配置（course.verification.*）
    private final VerificationProperties verificationProperties;
    // redis key 构建器
    private final RedisKeyBuilder redisKeyBuilder;

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
        newUser.setDeleted(false);
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
        String userTokenKey = redisKeyBuilder.userTokens(userId);
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
        Long userId = UserContext.get();
        String userTokenKey = redisKeyBuilder.userTokens(userId);
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
        if (user == null || user.getDeleted()) {
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
        String email = request.getEmail();

        // 1. 节流：重发间隔内命中直接 1009（契约：验证码重发间隔 → 1009）
        String throttleKey = redisKeyBuilder.pwdResetThrottle(email);
        if (redisTemplate.hasKey(throttleKey)) {
            throw new BizException(ErrorCode.TOO_MANY_REQUESTS);
        }

        // 2. 单邮箱单日上限（契约：单日超限 → 1009）
        String today = LocalDate.now().toString();
        String dailyKey = redisKeyBuilder.pwdResetDailyCount(email, today);
        Long sentCount = redisTemplate.opsForValue().increment(dailyKey);
        if (sentCount != null && sentCount == 1L) {
            // 首次计数：设 1 天过期，避免 key 永久残留
            redisTemplate.expire(dailyKey, Duration.ofDays(1));
        }
        if (sentCount != null && sentCount > verificationProperties.getMaxSendPerDay()) {
            throw new BizException(ErrorCode.TOO_MANY_REQUESTS);
        }

        // 3. 防枚举：mask-not-found=true（契约默认）时未注册邮箱不发信，但同样返回成功
        Long count = lambdaQuery()
                .eq(User::getEmail, email)
                .count();
        if (count == 0) {
            if (verificationProperties.isMaskNotFound()) {
                return;
            }
            throw new BizException(ErrorCode.NOT_FOUND, "邮箱未注册");
        }

        // 4. 生成验证码（长度取配置），以【邮箱】为 key 缓存（契约写死键含邮箱），TTL 取配置
        String code = generateCode(verificationProperties.getCodeLength());
        String codeKey = redisKeyBuilder.pwdResetCode(email);
        redisTemplate.opsForValue()
                .set(codeKey, code, Duration.ofSeconds(verificationProperties.getTtl()));

        // 5. 写节流标记，重发间隔内不可重发
        redisTemplate.opsForValue()
                .set(throttleKey, "1", Duration.ofSeconds(verificationProperties.getResendInterval()));

        // 6. 异步发信（不阻塞主流程）
        emailService.sendResetCodeAsync(email, code);
    }

    @Override
    public void resetPassword(ResetPasswordRequest request) {
        // 1. 邮箱是否已注册；未注册统一 1008（不区分原因，防枚举）
        String email = request.getEmail();
        User user = lambdaQuery()
                .eq(User::getEmail, email)
                .one();
        if (user == null || user.getDeleted()) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        // 2. 校验验证码：key 含邮箱（契约写死），【比对值】而不是 hasKey
        String code = request.getCode();
        String codeKey = redisKeyBuilder.pwdResetCode(email);
        Object stored = redisTemplate.opsForValue().get(codeKey);
        if (stored == null || !code.equals(stored.toString())) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID);
        }

        // 3. 新密码不能与旧密码相同 + 强度校验（违规 1001）
        String newPassword = request.getNewPassword();
        if (passwordService.matches(newPassword, user.getPasswordHash())) {
            throw new BizException(ErrorCode.VERIFICATION_CODE_INVALID, "新密码不能与原密码相同");
        }
        passwordService.validateStrength(newPassword);

        // 4. 更新密码
        user.setPasswordHash(passwordService.hash(newPassword));
        updateById(user);

        // 5. 吊销该用户全部 refresh token（强制重新登录，契约写死）
        String userTokenKey = redisKeyBuilder.userTokens(user.getId());
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

        // 6. 验证码一次性作废（放最后：delete 极少失败，失败也只是等 300s 自然过期，不影响已完成的密码更新）
        redisTemplate.delete(codeKey);
    }

    @Override
    public List<User> getUserByBathIds(List<Long> ids) {
        return lambdaQuery()
                .in(User::getId, ids)
                .list();
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
        String userTokenKey = redisKeyBuilder.userTokens(user.getId());

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
