package com.course.backend.modules.material.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/4
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeleteResultVO {
    private Long id;

    private boolean deleted = true;
}
