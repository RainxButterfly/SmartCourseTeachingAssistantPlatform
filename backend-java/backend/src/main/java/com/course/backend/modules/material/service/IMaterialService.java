package com.course.backend.modules.material.service;

import com.course.backend.common.response.ApiResponse;
import com.course.backend.modules.material.dto.request.CompleteRequest;
import com.course.backend.modules.material.dto.request.PresignRequest;
import com.course.backend.modules.material.dto.response.PresignResponse;
import com.course.backend.modules.material.dto.response.UploadVO;
import com.course.backend.modules.material.entity.Material;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.validation.Valid;

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
}
