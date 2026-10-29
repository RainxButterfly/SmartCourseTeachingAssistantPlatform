package com.course.backend.modules.auth.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;

import java.io.Serial;
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
 * @since 2026-10-09
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_user")
public class User implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 用户 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 登录邮箱，全局唯一
     */
    @TableField("email")
    private String email;

    /**
     * 用户名，2-20 字
     */
    @TableField("username")
    private String username;

    /**
     * 密码哈希（bcrypt，约 60 字符）
     */
    @TableField("password_hash")
    private String passwordHash;

    /**
     * 头像 URL，无则 NULL
     */
    @TableField("avatar")
    private String avatar;

    /**
     * 账号状态：1=正常 0=禁用
     */
    @TableField("status")
    private Integer status;

    /**
     * 创建时间
     */
    @TableField("created_at")
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @TableField("updated_at")
    private LocalDateTime updatedAt;

    /**
     * 软删：false=正常 true=已删
     * 属性名必须是 deleted，才能匹配 yml 的 logic-delete-field: deleted
     */
    @TableField("is_deleted")
    private Boolean deleted;


}
