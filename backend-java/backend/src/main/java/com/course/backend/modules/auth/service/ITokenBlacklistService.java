package com.course.backend.modules.auth.service;

import com.course.backend.modules.auth.entity.TokenBlacklist;
import com.baomidou.mybatisplus.extension.service.IService;

import java.time.LocalDateTime;
import java.util.Date;

/**
 * <p>
 * 作废 token 黑名单 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-08
 */
public interface ITokenBlacklistService extends IService<TokenBlacklist> {
    boolean checkExistJti(String jti);

    boolean addTokenToBlacklist(String jti, LocalDateTime tokenExpiration);

    boolean isBlacklisted(String jti);
}
