package com.course.backend.modules.material.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/30
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MaterialName {

    /**
     * 新的展示名
     */
    @NotBlank
    @Size(max = 255, message = "展示名长度必须在 1 到 255 个字符之间")
    @Schema(description = "资料新展示名")
    private String name;
}
