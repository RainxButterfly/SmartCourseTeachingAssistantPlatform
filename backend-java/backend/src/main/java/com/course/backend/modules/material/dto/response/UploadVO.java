package com.course.backend.modules.material.dto.response;

import com.course.backend.common.enums.MaterialStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/28
 */

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UploadVO {
    @JsonProperty("task_id")
    private Long taskId;

    @JsonProperty("material_ids")
    private List<Long> materialIds;

    @JsonProperty("status")
    @Builder.Default
    private String status = "QUEUED";
}
