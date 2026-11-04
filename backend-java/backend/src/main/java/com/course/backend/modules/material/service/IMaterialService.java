package com.course.backend.modules.material.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.material.dto.request.CompleteRequest;
import com.course.backend.modules.material.dto.request.MaterialName;
import com.course.backend.modules.material.dto.request.MaterialQueryRequest;
import com.course.backend.modules.material.dto.request.PresignRequest;
import com.course.backend.modules.material.dto.response.*;
import com.course.backend.modules.material.entity.Material;
import com.baomidou.mybatisplus.extension.service.IService;
import org.springframework.web.multipart.MultipartFile;

/**
 * <p>
 * 资料（MinIO 锚点） 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
public interface IMaterialService extends IService<Material> {

    void deleteByCourseId(Long id);

    ApiResponse<PresignResponse> presign(PresignRequest request);

    ApiResponse<UploadVO> completeUpload(CompleteRequest request);

    ApiResponse<MaterialPage> queryMaterialPage(Long id, MaterialQueryRequest query);

    ApiResponse<MaterialVO> getMaterialDetail(Long id);

    ApiResponse<MaterialVO> renameMaterial(Long id, MaterialName newName);

    ApiResponse<DeleteResultVO> deleteMaterial(Long id);

    ApiResponse<ParseStatusVO> parseTaskStatus(Long id);

    ApiResponse<UploadVO> reparse(Long id);

    ApiResponse<DownloadVO> download(Long id);

    ApiResponse<UploadVO> multipartUpload(Long courseId, MultipartFile file);
}
