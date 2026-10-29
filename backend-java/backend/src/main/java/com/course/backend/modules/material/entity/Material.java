package com.course.backend.modules.material.entity;

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
 * 资料（MinIO 锚点）
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("t_material")
public class Material implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 资料 ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 所属课程 ID
     */
    private Long courseId;

    /**
     * 展示名（可重命名）
     */
    private String name;

    /**
     * 上传时的原始文件名（不可改）
     */
    private String originalName;

    /**
     * MinIO 对象键，不存服务器绝对路径
     */
    private String objectKey;

    /**
     * 文件字节数（上限 52428800）
     */
    private Long sizeBytes;

    /**
     * 页数，解析后回填
     */
    private Integer pageCount;

    /**
     * 格式：PDF / PPTX / DOCX / MD
     */
    private String format;

    /**
     * 状态：UPLOADING/PENDING/PARSING/EMBEDDING/READY/FAILED
     */
    private String status;

    /**
     * 失败原因，非 FAILED 为 NULL
     */
    private String errorMsg;

    /**
     * 版本号，重新上传或重解析递增
     */
    private Integer version;

    /**
     * 文件 SHA-256，用于秒传/去重
     */
    private String sha256;

    /**
     * 切片数，向量化完成后回填
     */
    private Integer chunkCount;

    /**
     * 上传批次号（同一次 presign 共享）
     */
    private String uploadBatchId;

    /**
     * 上传者用户 ID
     */
    private Long uploadedBy;

    /**
     * 上传时间
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
