package com.course.backend.modules.material.controller;


import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.material.dto.request.CompleteRequest;
import com.course.backend.modules.material.dto.request.PresignRequest;
import com.course.backend.modules.material.dto.response.PresignResponse;
import com.course.backend.modules.material.dto.response.UploadVO;
import com.course.backend.modules.material.service.IMaterialService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

/**
 * <p>
 * 资料（MinIO 锚点） 前端控制器
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
@RestController
@RequestMapping("/materials")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "资料模块", description = "资料分页、新建资料、资料详情等")
public class MaterialController {
    private final IMaterialService materialService;

    @PostMapping("/presign")
    @Operation(summary = "申请预签名上传凭证（第一步）", description = "单次最多 10 个文件。后端已在此步落 t_material(status=UPLOADING) 占位记录并预分配 material_id。\n" +
            "\n" +
            "约束（写死）：单文件 ≤ 50MB（52428800 字节）；格式仅 PDF / PPTX / DOCX / MD；upload_url 有效期 900 秒。超限返回 2001（413），格式不支持返回 2002（415）。")
    public ApiResponse<PresignResponse> presign(@Valid @RequestBody PresignRequest request) {
        return materialService.presign(request);
    }

    @PostMapping("/complete")
    @Operation(summary = "上传完成确认（第三步）", description = "前端直传 MinIO 成功后调用。")
    public ApiResponse<UploadVO> completeUpload(@Valid @RequestBody CompleteRequest request) {
        return materialService.completeUpload(request);
    }
}
