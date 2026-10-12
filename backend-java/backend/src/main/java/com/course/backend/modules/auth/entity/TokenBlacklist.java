package com.course.backend.modules.auth.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableId;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 作废 token 黑名单
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_token_blacklist")
public class TokenBlacklist implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * JWT 的 jti 声明（作废 token 的唯一标识）
     */
    @TableId(value = "jti", type = IdType.INPUT)
    private String jti;

    /**
     * 该 token 的自然过期时间，到期即可清理
     */
    private LocalDateTime expireAt;

    /**
     * 加入黑名单时间
     */
    private LocalDateTime createdAt;


}
