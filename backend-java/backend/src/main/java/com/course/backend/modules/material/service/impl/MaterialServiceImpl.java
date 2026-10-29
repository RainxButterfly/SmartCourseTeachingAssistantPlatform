package com.course.backend.modules.material.service.impl;

import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.course.backend.common.enums.CourseVisibility;
import com.course.backend.common.enums.ErrorCode;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.util.DateTimeUtils;
import com.course.backend.config.properties.MinioProperties;
import com.course.backend.modules.course.entity.Course;
import com.course.backend.modules.course.mapper.CourseMapper;
import com.course.backend.modules.material.dto.request.CompleteItem;
import com.course.backend.modules.material.dto.request.CompleteRequest;
import com.course.backend.modules.material.dto.request.PresignFileItem;
import com.course.backend.modules.material.dto.request.PresignRequest;
import com.course.backend.modules.material.dto.response.PresignItemVO;
import com.course.backend.modules.material.dto.response.PresignResponse;
import com.course.backend.modules.material.dto.response.UploadVO;
import com.course.backend.modules.material.entity.Material;
import com.course.backend.modules.material.entity.ParseTask;
import com.course.backend.modules.material.entity.PendingMaterial;
import com.course.backend.modules.material.mapper.MaterialMapper;
import com.course.backend.modules.material.service.IMaterialService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.course.backend.security.UserContext;
import io.minio.*;
import io.minio.errors.*;
import io.minio.http.Method;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import static com.course.backend.common.constant.ContractConstants.ALLOWED_EXTENSIONS;
import static com.course.backend.common.constant.ContractConstants.MAX_FILE_SIZE_BYTES;
import static com.course.backend.common.enums.MaterialStatus.PENDING;
import static com.course.backend.common.enums.MaterialStatus.UPLOADING;

/**
 * <p>
 * 资料（MinIO 锚点） 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MaterialServiceImpl extends ServiceImpl<MaterialMapper, Material> implements IMaterialService {
    private final CourseMapper courseMapper;
    private final MinioClient minioClient;
    private final MinioProperties minioProperties;

    @Override
    public void deleteByCourseId(Long id) {
        boolean remove = this.remove(Wrappers.lambdaQuery(Material.class)
                .eq(Material::getCourseId, id));
        if (remove) {
            log.info("删除课程{}下的所有资料", id);
        } else {
            log.info("课程 {} 下无资料可删", id);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<PresignResponse> presign(PresignRequest request) {
        // 1. 判断是否属于用户
        // 1.1 获取用户
        Long userId = UserContext.getRequired();
        // 1.2 获取课程用户
        Long courseId = request.getCourseId();
        Course course = courseMapper.selectById(courseId);
        if (course == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        // 1.3 公开课程允许多人上传
        if (course.getVisibility() != CourseVisibility.PUBLIC) {
            if (!userId.equals(course.getOwnerId())) {
                throw new BizException(ErrorCode.NO_PERMISSION);
            }
        }


        // 2. 读取文件
        List<PresignFileItem> files = request.getFiles();
        for (PresignFileItem file : files) {
            // 3. 获取文件扩展名
            String originalName = file.getOriginalName();
            log.info("文件 {} {}", originalName, file.getClientFileId());
            String fileExtension = extractExtension(originalName);
            if (!ALLOWED_EXTENSIONS.contains(fileExtension)) {
                // 3.1 不支持 抛出2002
                throw new BizException(ErrorCode.INVALID_FILE_TYPE,
                        "文件「" + file.getOriginalName() + "」格式不支持，仅支持 PDF / PPTX / DOCX / MD");
            }
            if (file.getSizeBytes() > MAX_FILE_SIZE_BYTES) {
                // 3.2 超出大小 抛2001
                throw new BizException(ErrorCode.FILE_SIZE_EXCEEDED);
            }

        }

        // 4. 组装数据
        // 4.1 生成uploadBatchId
        String uploadBatchId = "batch_" + DateTimeUtils.toBatchTimestamp()
                + "_" + IdUtil.fastSimpleUUID().substring(0, 4);

        // 4.2 遍历已校验通过的文件 → 构造 Material
        LocalDate now = LocalDate.now();
        List<PendingMaterial> pending = files.stream().map(file -> {
            String ext = extractExtension(file.getOriginalName());
            int year = now.getYear();
            int month = now.getMonthValue();
            String objectKey = "course/" + courseId + "/" + year + "/" + month + "/"
                    + UUID.randomUUID().toString().replace("-", "")
                    + "." + ext;
            Material m = new Material()
                    .setCourseId(courseId)
                    .setName(file.getOriginalName())
                    .setOriginalName(file.getOriginalName())
                    .setObjectKey(objectKey)
                    .setSizeBytes(file.getSizeBytes())
                    .setFormat(ext.toUpperCase(Locale.ROOT))
                    .setStatus(UPLOADING.getValue())
                    .setVersion(1)
                    .setUploadBatchId(uploadBatchId)
                    .setUploadedBy(userId)
                    .setSha256(file.getSha256());
            return new PendingMaterial(m, file);
        }).toList();

        // 4.3 saveBatch(list) → 拿回填的 id
        saveBatch(pending.stream().map(PendingMaterial::material).toList());

        // 4.4 遍历 list 做签名 → 组装 PresignItemVO
        List<PresignItemVO> items = pending.stream()
                .map(p -> {
                    Material m = p.material();
                    PresignFileItem src = p.source();
                    return PresignItemVO.builder()
                            .clientFileId(src.getClientFileId())
                            .materialId(m.getId())
                            .objectKey(m.getObjectKey())
                            .uploadUrl(presignPutUrl(m.getObjectKey()))
                            .method("PUT")
                            .headers(Map.of("Content-Type", src.getContentType()))
                            .maxSizeBytes(MAX_FILE_SIZE_BYTES)
                            .build();

                }).toList();

        // 4.5 组装 PresignResponse 并且返回
        return ApiResponse.ok(new PresignResponse(uploadBatchId, minioProperties.getPresignExpireSeconds(), items));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<UploadVO> completeUpload(CompleteRequest request) {
        // 1. 获取用户信息
        Long userId = UserContext.getRequired();
        // 2. 一次 IN 查询
        List<CompleteItem> items = request.getItems();
        List<Long> mIds = items.stream().map(CompleteItem::getMaterialId).toList();
        List<Material> materials = lambdaQuery()
                .in(Material::getId, mIds)
                .eq(Material::getUploadedBy, userId)
                .eq(Material::getUploadBatchId, request.getUploadBatchId())
                .eq(Material::getStatus, UPLOADING.getValue())
                .list();
        // 3. 数量校验：查出来的条数 != 请求条数 → 1004 （id 不属于自己 / 批次不对 / 已 complete 过）
        long distinct = mIds.stream().distinct().count();
        if (distinct != mIds.size()) {
            throw new BizException(ErrorCode.PARAM_ERROR);
        }
        if (materials.size() != items.size()) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        // 4. 逐个 statObject
        for (Material material : materials) {
            try {
                StatObjectResponse stat = minioClient.statObject(
                        StatObjectArgs.builder()
                                .bucket(minioProperties.getBucket())
                                .object(material.getObjectKey())
                                .build()
                );

                if (stat.size() > MAX_FILE_SIZE_BYTES) {
                    // 超限对象删除
                    removeObjectQuietly(material.getObjectKey());
                    throw new BizException(ErrorCode.FILE_SIZE_EXCEEDED);
                }
            }  catch (ErrorResponseException   e) {
                // 对象不存在 / 无权限，都按「文件没传成功」处理
                throw new BizException(ErrorCode.NOT_FOUND, "文件未成功上传，请重新上传");
            } catch (InsufficientDataException | InternalException | InvalidKeyException |
                    InvalidResponseException | IOException | NoSuchAlgorithmException | ServerException |
                    XmlParserException e) {
                log.error("文件上传校验失败: objectKey={}", material.getObjectKey(), e);
                throw new BizException(ErrorCode.INTERNAL_ERROR, "文件上传校验失败");
            }
        }
        // 5. 批量更新
        boolean updated = lambdaUpdate()
                .in(Material::getId, mIds)
                .eq(Material::getStatus, UPLOADING.getValue())
                .set(Material::getStatus, PENDING.getValue())
                .update();

        // 6. 每个 material 插一条任务
        List<ParseTask> tasks = materials.stream().map(m -> {
            ParseTask task = new ParseTask();
            task.setMaterialId(m.getId());
            task.setStatus("QUEUED");
            task.setProgress(0);
            task.setTotalChunks(0);
            task.setIndexedChunks(0);
            return task;
        }).toList();

        // 7. 组装vo
        return ApiResponse.ok(UploadVO.builder()
                .taskId(tasks.getFirst().getId())
                .materialIds(mIds)
                .status("QUEUED")
                .build());
    }

    private void removeObjectQuietly(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .build()
            );
            log.info("已删除无效对象: {}", objectKey);
        } catch (Exception e) {
            // 删不掉不是业务错误：对象会被僵尸清理任务回收，不该让用户看到 500
            log.warn("删除对象失败: objectKey={}", objectKey, e);
        }
    }

    /**
     * 生成预签名 PUT URL
     * @param objectKey 对象键
     * @return 预签名 PUT URL
     */
    private String presignPutUrl(String objectKey) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.PUT)
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .expiry(minioProperties.getPresignExpireSeconds())
                            .build());
        } catch (Exception e) {
            log.error("生成预签名 URL 失败: objectKey={}", objectKey, e);
            throw new BizException(ErrorCode.INTERNAL_ERROR, "生成上传凭证失败");
        }
    }

    /**
     * 提取文件扩展名
     * @param fileName 文件名
     * @return 文件扩展名
     */
    private String extractExtension(String fileName) {
        int doc = fileName.lastIndexOf(".");
        if (doc < 0 || doc == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(doc + 1).toLowerCase(Locale.ROOT);
    }
}
