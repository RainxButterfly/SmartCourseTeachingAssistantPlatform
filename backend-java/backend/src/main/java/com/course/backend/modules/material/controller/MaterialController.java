package com.course.backend.modules.material.controller;


import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.material.dto.request.CompleteRequest;
import com.course.backend.modules.material.dto.request.MaterialName;
import com.course.backend.modules.material.dto.request.PresignRequest;
import com.course.backend.modules.material.dto.response.*;
import com.course.backend.modules.material.service.IMaterialService;
import com.course.backend.modules.material.service.IParseTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/{id}")
    @Operation(summary = "资料详情", description = "资料详情。")
    public ApiResponse<MaterialVO> getMaterialDetail(@PathVariable("id") Long id) {
        return materialService.getMaterialDetail(id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "重命名资料", description = "仅支持改名（name 为展示名，original_name 不可改）。")
    public ApiResponse<MaterialVO> renameMaterial(@PathVariable("id") Long id, @Valid @RequestBody MaterialName request) {
        return materialService.renameMaterial(id, request);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除资料", description = "同步删除 MinIO 对象与 Milvus 向量，并写入一条 t_activity(type=MATERIAL_DELETED)。")
    public ApiResponse<DeleteResultVO> deleteMaterial(@PathVariable("id") Long id) {
        return materialService.deleteMaterial(id);
    }

    @GetMapping("/{id}/parse-status")
    @Operation(summary = "解析任务状态（前端轮询）", description = "前端在资料处于中间态（UPLOADING / PENDING / PARSING / EMBEDDING）时轮询。")
    public ApiResponse<ParseStatusVO> parseTaskStatus(@PathVariable("id") Long id) {
        return materialService.parseTaskStatus(id);
    }

    @PostMapping("/{id}/reparse")
    @Operation(summary = "重新解析", description = "重新投递解析任务，返回新的 task_id。已有进行中的解析任务时返回 2003。")
    public ApiResponse<UploadVO> reparse(@PathVariable("id") Long id) {
        return materialService.reparse(id);
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "下载原文", description = "返回预签名 GET URL（有效期 900 秒），前端直接跳转/下载，不经过后端转发。")
    public ApiResponse<DownloadVO> download(@PathVariable("id") Long id) {
        return materialService.download(id);
    }

}
