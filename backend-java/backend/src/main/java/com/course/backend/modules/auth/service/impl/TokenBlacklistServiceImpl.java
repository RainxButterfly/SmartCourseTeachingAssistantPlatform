package com.course.backend.modules.auth.service.impl;

import com.course.backend.modules.auth.entity.TokenBlacklist;
import com.course.backend.modules.auth.mapper.TokenBlacklistMapper;
import com.course.backend.modules.auth.service.ITokenBlacklistService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * <p>
 * 作废 token 黑名单 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-08
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenBlacklistServiceImpl extends ServiceImpl<TokenBlacklistMapper, TokenBlacklist> implements ITokenBlacklistService {
    private final TokenBlacklistMapper blacklistMapper;

    @Override
    public boolean checkExistJti(String jti) {
        Long count = lambdaQuery()
                .eq(TokenBlacklist::getJti, jti)
                .count();
        return count > 0;
    }

    @Override
    public boolean addTokenToBlacklist(String jti, LocalDateTime tokenExpiration) {
        if (isBlacklisted(jti)) {
            return true;
        }
        return save(new TokenBlacklist().setJti(jti).setExpireAt(tokenExpiration));
    }

    @Override
    public boolean isBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        return lambdaQuery()
                .eq(TokenBlacklist::getJti, jti)
                .exists();
    }
}
