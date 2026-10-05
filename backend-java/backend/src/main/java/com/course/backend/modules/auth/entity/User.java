package com.course.backend.modules.auth.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 用户
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-06
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_user")
public class User implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 登录邮箱，全局唯一
     */
    private String email;

    /**
     * 用户名，2-20 字
     */
    private String username;

    /**
     * 密码哈希（bcrypt，约 60 字符）
     */
    private String passwordHash;

    /**
     * 头像 URL，无则 NULL
     */
    private String avatar;

    /**
     * 账号状态：1=正常 0=禁用
     */
    private Integer status;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 软删：0=正常 1=已删
     */
    private Boolean isDeleted;


}
