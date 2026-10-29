package com.course.backend.modules.material.entity;

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
 * 解析任务
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-29
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_parse_task")
public class ParseTask implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 解析任务 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 关联资料 ID
     */
    private Long materialId;

    /**
     * 状态：QUEUED/RUNNING/SUCCESS/FAILED
     */
    private String status;

    /**
     * 进度百分比 0-100
     */
    private Integer progress;

    /**
     * 切片总数
     */
    private Integer totalChunks;

    /**
     * 已向量化的切片数
     */
    private Integer indexedChunks;

    /**
     * 失败原因
     */
    private String errorMsg;

    /**
     * 开始时间，未开始为 NULL
     */
    private LocalDateTime startedAt;

    /**
     * 结束时间，未结束为 NULL
     */
    private LocalDateTime finishedAt;

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
