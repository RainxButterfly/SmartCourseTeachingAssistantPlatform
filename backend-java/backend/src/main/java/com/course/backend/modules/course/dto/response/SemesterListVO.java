package com.course.backend.modules.course.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * 学期字典（契约 SemesterListVO）：按学期倒序，已过滤空学期。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
@Data
public class SemesterListVO {

    @Schema(description = "学期选项列表")
    private List<SemesterOptionVO> items;
}
