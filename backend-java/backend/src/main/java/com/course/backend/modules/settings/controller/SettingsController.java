package com.course.backend.modules.settings.controller;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.settings.dto.request.ModelConfigRequest;
import com.course.backend.modules.settings.dto.response.ModelConfigVO;
import com.course.backend.modules.settings.dto.response.ModelTestVO;
import com.course.backend.modules.settings.service.ISettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/11/6
 */

@RestController
@RequestMapping("/settings/model")
@RequiredArgsConstructor
@Tag(name = "系统设置模块", description = "系统设置模块")
public class SettingsController {
    private final ISettingsService settingsService;

    @GetMapping
    @Operation(summary = "读取大模型配置", description = "API Key 只写不读：接口永不返回明文，只回显掩码（如 sk-****f3a1）；未配置时 api_key_masked 为 \"\"、has_api_key 为 false。")
    public ApiResponse<ModelConfigVO> getModelConfig() {
        return settingsService.getModelConfig();
    }

    @PutMapping
    @Operation(summary = "保存大模型配置", description = "后端写入本地配置文件")
    public ApiResponse<ModelConfigVO> saveModelConfig(@Valid @RequestBody ModelConfigRequest request) {
        return settingsService.saveModelConfig(request);
    }

    @PostMapping("/test")
    @Operation(summary = "测试连接（探活）", description = "用当前表单值探活一次")
    public ApiResponse<ModelTestVO> testConnection(@Valid @RequestBody ModelConfigRequest request) {
        return settingsService.testConnection(request);
    }
}
