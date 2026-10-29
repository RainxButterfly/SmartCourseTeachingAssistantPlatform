package com.course.backend.modules.course.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jetbrains.annotations.NotNull;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DeleteResultVO {
    @Schema(description = "被删除资源的数值主键")
    @NotNull
    private Long id;

    @Schema(description = "删除操作是否成功，恒为 true")
    private boolean deleted = true;
}
