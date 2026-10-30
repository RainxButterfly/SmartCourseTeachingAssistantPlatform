package com.course.backend.modules.material.dto.request;

import com.course.backend.common.enums.MaterialStatus;
import com.course.backend.common.util.PageUtils;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Material Query Request
 * @author StarLeaf-Roxy
 * @since 2026/10/30
 */

@EqualsAndHashCode(callSuper = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MaterialQueryRequest extends PageUtils.PageQueryDTO {

    @JsonProperty("status")
    @Schema(description = "按资料状态过滤\n")
    private MaterialStatus status;

    @JsonProperty("keyword")
    @Schema(description = "按资料名模糊匹配\n")
    @Size(max = 255, message = "关键字长度不能超过255个字符")
    private String keyword;
}
