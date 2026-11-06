package com.course.backend.modules.settings.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.settings.dto.request.ModelConfigRequest;
import com.course.backend.modules.settings.dto.response.ModelConfigVO;
import com.course.backend.modules.settings.dto.response.ModelTestVO;
import jakarta.validation.Valid;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/7
 */
public interface ISettingsService {
    ApiResponse<ModelConfigVO> getModelConfig();

    ApiResponse<ModelConfigVO> saveModelConfig(@Valid ModelConfigRequest request);

    ApiResponse<ModelTestVO> testConnection(@Valid ModelConfigRequest request);
}
