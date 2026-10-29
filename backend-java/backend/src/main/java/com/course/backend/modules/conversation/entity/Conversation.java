package com.course.backend.modules.conversation.entity;

import com.baomidou.mybatisplus.annotation.TableField;
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
 * 会话
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_conversation")
public class Conversation implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 会话 ID（对外为数字字符串）
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 所属用户 ID
     */
    private Long userId;

    /**
     * 检索范围课程 ID，0=全部资料
     */
    private Long courseId;

    /**
     * 会话标题
     */
    private String title;

    /**
     * 消息条数
     */
    private Integer messageCount;

    /**
     * 最近一条消息时间
     */
    private LocalDateTime lastMessageAt;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 软删：false=正常 true=已删
     * 属性名必须是 deleted，才能匹配 yml 的 logic-delete-field: deleted
     */
    @TableField("is_deleted")
    private Boolean deleted;


}
