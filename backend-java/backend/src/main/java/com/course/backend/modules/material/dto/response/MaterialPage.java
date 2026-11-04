package com.course.backend.modules.material.dto.response;

import com.course.backend.common.util.PageUtils;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/30
 */

@EqualsAndHashCode(callSuper = true)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MaterialPage extends PageUtils.PageQueryDTO {

    @Schema(description = "资料列表")
    private List<MaterialVO> list;

    @Schema(description = "总记录数")
    private Long total;
}
