package com.course.backend.modules.activity.entity;

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
 * 活动流
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-20
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_activity")
public class Activity implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 活动 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 所属用户 ID
     */
    private Long userId;

    /**
     * 活动类型（5 类，见 PAD §8 写入时机清单）
     */
    private String type;

    /**
     * 关联目标 ID（字符串）
     */
    private String targetId;

    /**
     * 关联目标类型：COURSE/MATERIAL/QUIZ_ATTEMPT/CONVERSATION
     */
    private String targetType;

    /**
     * 可直接展示的文案，写入时生成
     */
    private String title;

    /**
     * 附加载荷；前端不解析，仅留档
     */
    private String payload;

    /**
     * 发生时间
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
