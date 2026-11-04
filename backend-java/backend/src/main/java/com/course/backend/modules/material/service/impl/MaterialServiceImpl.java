package com.course.backend.modules.material.service.impl;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.IdUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.course.backend.common.enums.*;
import com.course.backend.common.exception.BizException;
import com.course.backend.common.response.ApiResponse;
import com.course.backend.common.util.DateTimeUtils;
import com.course.backend.common.util.PageUtils;
import com.course.backend.config.properties.MinioProperties;
import com.course.backend.modules.activity.entity.Activity;
import com.course.backend.modules.activity.service.IActivityService;
import com.course.backend.modules.auth.entity.User;
import com.course.backend.modules.auth.service.IAuthService;
import com.course.backend.modules.course.entity.Course;
import com.course.backend.modules.course.mapper.CourseMapper;
import com.course.backend.modules.material.dto.request.*;
import com.course.backend.modules.material.dto.response.*;
import com.course.backend.modules.material.entity.Material;
import com.course.backend.modules.material.entity.ParseTask;
import com.course.backend.modules.material.entity.PendingMaterial;
import com.course.backend.modules.material.mapper.MaterialMapper;
import com.course.backend.modules.material.service.IMaterialService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.course.backend.modules.material.service.IParseTaskService;
import com.course.backend.security.UserContext;
import io.minio.*;
import io.minio.errors.*;
import io.minio.http.Method;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.course.backend.common.constant.ContractConstants.ALLOWED_EXTENSIONS;
import static com.course.backend.common.constant.ContractConstants.MAX_FILE_SIZE_BYTES;
import static com.course.backend.common.constant.FileConstants.MULTIPART_MAX_SIZE_BYTES;
import static com.course.backend.common.enums.MaterialStatus.PENDING;
import static com.course.backend.common.enums.MaterialStatus.UPLOADING;
import static com.course.backend.common.enums.ParseTaskStatus.QUEUED;

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
    private final IParseTaskService parseTaskService;
    private final IAuthService authService;
    private final IActivityService activityService;

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
            String objectKey = getObjectKey(courseId, now, ext);
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
                            .uploadUrl(presignUrl(m.getObjectKey(), Method.PUT))
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
        if (!updated) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT);
        }

        // 6. 每个 material 插一条任务
        List<ParseTask> tasks = materials.stream().map(m -> {
            ParseTask task = new ParseTask();
            task.setMaterialId(m.getId());
            task.setStatus(QUEUED);
            task.setProgress(0);
            task.setTotalChunks(0);
            task.setIndexedChunks(0);
            return task;
        }).toList();
        parseTaskService.saveBatch(tasks);

        // 7. 组装vo
        return ApiResponse.ok(UploadVO.builder()
                .taskId(tasks.getFirst().getId())
                .materialIds(mIds)
                .status(QUEUED.getValue())
                .build());
    }

    @Override
    public ApiResponse<MaterialPage> queryMaterialPage(Long id, MaterialQueryRequest query) {
        // 1. 获取用户
        Long userId = UserContext.getRequired();

        // 2. 课程存在和课程可见性
        Course course = courseMapper.selectById(id);
        if (course == null) throw new BizException(ErrorCode.NOT_FOUND);
        verifyCourseVisibility(id, userId);

        // 3. 分页参数
        Page<Material> pageParam = PageUtils
                .toMpPage(query.getPage(), query.getSize(), 10);
        int pageNum = Math.toIntExact(pageParam.getCurrent());
        int pageSize = Math.toIntExact(pageParam.getSize());

        // 4. 条件：course_id + status? + keyword?
        LambdaQueryWrapper<Material> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Material::getCourseId, id)
               .eq(query.getStatus() != null, Material::getStatus,
                       query.getStatus() == null ? null : query.getStatus().getValue())
               .like(StringUtils.hasText(query.getKeyword()),
                       Material::getName, query.getKeyword())
               .orderByDesc(Material::getCreatedAt);
        // 5. 分页查询
        Page<Material> result = page(pageParam, wrapper);

        // 6. 空页直接返回，避免对空集合做无意义的用户查询
        List<Material> records = result.getRecords();
        if (records.isEmpty()) {
            MaterialPage emptyPage = new MaterialPage();
            emptyPage.setList(List.of());
            emptyPage.setTotal(0L);
            emptyPage.setSize(pageSize);
            emptyPage.setPage(pageNum);
            return ApiResponse.ok(emptyPage);
        }

        // 7. 批量取上传者昵称（一次 IN 查询，避免 N+1）
        List<Long> uploaderIds = records.stream()
                .map(Material::getUploadedBy).distinct().toList();
        Map<Long, String> names = authService.getUserByBathIds(uploaderIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        // 8. entity → VO（复用纯映射，上传者姓名来自批量查询，避免 N+1）
        List<MaterialVO> list = records.stream()
                .map(m -> toMaterialVO(m, names.getOrDefault(m.getUploadedBy(), "")))
                .toList();

        // 9. 组装分页结果
        MaterialPage materialPage = new MaterialPage();
        materialPage.setList(list);
        materialPage.setTotal(result.getTotal());
        materialPage.setSize(pageSize);
        materialPage.setPage(pageNum);
        return ApiResponse.ok(materialPage);
    }

    @Override
    public ApiResponse<MaterialVO> getMaterialDetail(Long id) {
        // 1. 获取用户
        Long userId = UserContext.getRequired();
        // 2. 拷贝
        Material material = getById(id);
        if (material == null) throw new BizException(ErrorCode.NOT_FOUND);
        verifyCourseVisibility(material.getCourseId(), userId);

        // 3. 返回数据
        return ApiResponse.ok(toMaterialVO(material));
    }

    @Override
    public ApiResponse<MaterialVO> renameMaterial(Long id, MaterialName newName) {
        // 1. 获取用户
        Long userId = UserContext.getRequired();
        // 2. 获取资料
        Material material = getById(id);
        if (material == null) throw new BizException(ErrorCode.NOT_FOUND);

        // 3. 验证写权限（课程 owner 或资料上传者）
        verifyMaterialEditable(material, userId);

        // 4. 修改资料名
        material.setName(newName.getName());
        boolean success = updateById(material);
        if (!success) {
            throw new BizException(ErrorCode.RESOURCE_CONFLICT);
        }

        // 5. 返回数据
        return ApiResponse.ok(toMaterialVO(material));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<DeleteResultVO> deleteMaterial(Long id) {
        // 1. 获取用户
        Long userId = UserContext.getRequired();

        // 2. 获取资料并验证写权限（课程 owner 或资料上传者）
        Material material = getById(id);
        if (material == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        verifyMaterialEditable(material, userId);

        String objectKey = material.getObjectKey();

        // 3. 删除材料
        if (!removeById(id)) throw new BizException(ErrorCode.RESOURCE_CONFLICT);

        // 4. 删除MinIO文件
        removeObjectQuietly(objectKey);

        // 5. 活动流保存活动
        Activity activity = new Activity();
        activity.setUserId(userId);
        activity.setType(ActivityType.MATERIAL_DELETED.getValue());
        activity.setTargetId(material.getId().toString());
        activity.setTargetType(ActivityType.MATERIAL_DELETED.getTargetType());
        activity.setTitle("删除资料《" + material.getName() + "》");
        activity.setDeleted(false);

        activityService.save(activity);

        // TODO Milvus 向量删除（Python 端就绪后投递 MQ）

        // 6. 组装返回
        return ApiResponse.ok(DeleteResultVO.builder().id(id).deleted(true).build());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<ParseStatusVO> parseTaskStatus(Long id) {
        // 1. 查询当前用户
        Long userId = UserContext.getRequired();
        Material material = getById(id);
        if (material == null) throw new BizException(ErrorCode.NOT_FOUND);
        verifyCourseVisibility(material.getCourseId(), userId);

        // 2. 取最新一条解析任务（reparse 后会有多条）
        ParseTask task = parseTaskService.lambdaQuery()
                .eq(ParseTask::getMaterialId, id)
                .orderByDesc(ParseTask::getId)
                .last("limit 1")
                .one();

        if (task == null) {
            throw new BizException(ErrorCode.NOT_FOUND, "解析任务尚未创建");
        }

        // 3. 组装vo
        ParseStatusVO vo = ParseStatusVO.builder()
                .taskId(task.getId())
                .materialId(task.getMaterialId())
                .status(task.getStatus())
                .progress(task.getProgress())
                .totalChunks(task.getTotalChunks())
                .indexedChunks(task.getIndexedChunks())
                .stage(resolveStage(task.getStatus(), task))
                .errorMsg(task.getErrorMsg())
                .startedAt(toIsoOrNull(task.getStartedAt()))
                .finishedAt(toIsoOrNull(task.getFinishedAt()))
                .build();
        return ApiResponse.ok(vo);
    }

    @Override
    public ApiResponse<UploadVO> reparse(Long id) {
        // 1. 用户 + 资料存在 + 写权限
        Long userId = UserContext.getRequired();
        Material material = getById(id);
        if (material == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        verifyMaterialEditable(material, userId);

        // 2. 检查是否有进行中的任务 → 有则 2003
        Long count = parseTaskService.lambdaQuery()
                .eq(ParseTask::getMaterialId, id)
                .in(ParseTask::getStatus,
                        QUEUED.getValue(),
                        ParseTaskStatus.RUNNING.getValue())
                .count();
        if (count > 0) throw new BizException(ErrorCode.PARSE_TASK_CONFLICT);

        // 3. 重置资料状态（PENDING + version+1 + 清零）
        lambdaUpdate()
                .eq(Material::getId, id)
                .set(Material::getStatus, PENDING.getValue())
                .set(Material::getVersion, material.getVersion() + 1)
                .set(Material::getPageCount, 0)
                .set(Material::getChunkCount, 0)
                .set(Material::getErrorMsg, null)
                .update();

        // 4. 新建一条 QUEUED 任务
        ParseTask parseTask = new ParseTask()
                .setMaterialId(id)
                .setStatus(QUEUED)
                .setProgress(0)
                .setTotalChunks(0)
                .setIndexedChunks(0);
        parseTaskService.save(parseTask);

        // TODO 投递 MQ 通知 Python 重新解析，并清理该资料在 Milvus 里的旧向量

        // 5. 返回 UploadVO（复用 complete 的响应结构）
        return ApiResponse.ok(UploadVO.builder()
                .taskId(parseTask.getId())
                .materialIds(List.of(id))
                .status(QUEUED.getValue())
                .build());
    }

    @Override
    public ApiResponse<DownloadVO> download(Long id) {
        // 1. 获取用户
        Long userId = UserContext.getRequired();
        // 2. 获取资料
        Material material = getById(id);
        if (material == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }

        // 3. 判断权限
        verifyCourseVisibility(material.getCourseId(), userId);

        // 4. 生成预签名下载 URL（必须是 GET，PUT 的签名拿去下载会 403）
        String url = presignUrl(material.getObjectKey(), Method.GET);

        // 5. 组装vo
        DownloadVO downloadVO = new DownloadVO()
                .setMaterialId(material.getId())
                .setUrl(url)
                .setFileName(material.getName())
                .setExpiresIn(minioProperties.getPresignExpireSeconds());

        return ApiResponse.ok(downloadVO);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<UploadVO> multipartUpload(Long courseId, MultipartFile file) {
        // 1. 课程存在 + 上传权限
        Long userId = UserContext.getRequired();
        verifyCourseVisibility(courseId, userId);

        // 2. 文件非空
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.PARAM_ERROR, "请选择要上传的文件");
        }

        // 3. 大小 <= 10MB
        if (file.getSize() > MULTIPART_MAX_SIZE_BYTES) {
            throw new BizException(ErrorCode.FILE_SIZE_EXCEEDED);
        }

        // 4. 格式白名单 （C:\fakepath\a.pdf 一些特殊情况，那么用工具包只取出来文件名）
        String originalName = FileUtil.getName(file.getOriginalFilename());
        if (originalName == null || originalName.isBlank()) {
            throw new BizException(ErrorCode.INVALID_FILE_TYPE, "文件名不能为空！");
        }
        String ext = extractExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BizException(ErrorCode.INVALID_FILE_TYPE,
                    "文件「" + originalName + "」格式不支持，仅支持 PDF / PPTX / DOCX / MD");
        }

        // 5. object_key
        LocalDate now = LocalDate.now();
        String objectKey = getObjectKey(courseId, now, ext);

        // 6. 后端上传minIO（这一步替代了前端直传）
        try (InputStream in = file.getInputStream()) {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .stream(in, file.getSize(), -1)
                            .contentType(file.getContentType() == null
                                    ? "application/octet-stream"
                                    : file.getContentType())
                            .build()
            );
        } catch (Exception e) {
            log.error("multipart 上传 MinIO 失败: objectKey={}", objectKey, e);
            throw new BizException(ErrorCode.INTERNAL_ERROR, "文件上传失败");
        }

        // 7. 落资料：已上传成功，直接 PENDING（没有 UPLOADING 阶段）
        Material material = new Material()
                .setCourseId(courseId)
                .setName(originalName)
                .setOriginalName(originalName)
                .setObjectKey(objectKey)
                .setSizeBytes(file.getSize())
                .setFormat(ext.toUpperCase(Locale.ROOT))
                .setStatus(PENDING.getValue())
                .setVersion(1)
                .setUploadedBy(userId)
                .setDeleted(false);
        save(material);

        // 8. 建解析任务
        ParseTask parseTask = new ParseTask()
                .setMaterialId(material.getId())
                .setStatus(QUEUED)
                .setProgress(0)
                .setTotalChunks(0)
                .setIndexedChunks(0);
        parseTaskService.save(parseTask);

        // 9. 返回（复用 complete 的响应结构）
        return ApiResponse.ok(UploadVO.builder()
                        .taskId(parseTask.getId())
                        .materialIds(List.of(material.getId()))
                        .status(QUEUED.getValue())
                        .build());
    }

    private static String getObjectKey(Long courseId, LocalDate now, String ext) {
        return "course/" + courseId + "/" + now.getYear() + "/" + now.getMonthValue()
                + "/" + UUID.randomUUID().toString().replace("-", "") + "." + ext;
    }

    /**
     * 根据任务状态解析当前任务阶段
     * @param status 任务状态
     * @param task 任务
     * @return 任务阶段
     */
    private String resolveStage(ParseTaskStatus status, ParseTask task) {
        return switch (status) {
            case QUEUED -> "排队中";
            case FAILED -> "解析失败";
            case SUCCESS -> "已完成";
            case RUNNING -> {
                int total = task.getTotalChunks() == null ? 0 : task.getTotalChunks();
                int indexed = task.getIndexedChunks() == null ? 0 : task.getIndexedChunks();
                if (total == 0) yield "解析文档中";
                yield indexed >= total ? "收尾中" : "向量化中";
            }
        };
    }

    private String toIsoOrNull(LocalDateTime time) {
        return time == null ? null : DateTimeUtils.toIso8601(time);
    }

    private void verifyMaterialEditable(Material material, Long userId) {
        Course course = courseMapper.selectById(material.getCourseId());
        if (course == null ) throw new BizException(ErrorCode.NOT_FOUND);

        boolean canEdit = userId.equals(course.getOwnerId())
                || userId.equals(material.getUploadedBy());

        if (!canEdit) throw new BizException(ErrorCode.NO_PERMISSION);
    }

    private void verifyCourseVisibility(Long courseId, Long userId) {
        // 1. 课程是否存在
        Course course = courseMapper.selectById(courseId);
        if (course == null) throw new BizException(ErrorCode.NOT_FOUND);
        // 2. 课程可见性
        CourseVisibility visibility = course.getVisibility();
        if (visibility != CourseVisibility.PUBLIC && !userId.equals(course.getOwnerId()))
            throw new BizException(ErrorCode.NO_PERMISSION);
    }

    private MaterialVO toMaterialVO(Material m, String uploaderName) {
        MaterialVO vo = new MaterialVO();
        vo.setId(m.getId());
        vo.setCourseId(m.getCourseId());
        vo.setName(m.getName());
        vo.setOriginalName(m.getOriginalName());
        vo.setObjectKey(m.getObjectKey());
        vo.setSizeBytes(m.getSizeBytes());
        vo.setPageCount(m.getPageCount());
        vo.setFormat(m.getFormat());
        vo.setStatus(MaterialStatus.valueOf(m.getStatus()));
        vo.setErrorMsg(m.getErrorMsg());
        vo.setVersion(m.getVersion());
        vo.setChunkCount(m.getChunkCount());
        vo.setUploadedBy(m.getUploadedBy());
        vo.setUploadedByName(uploaderName);
        vo.setCreatedAt(DateTimeUtils.toIso8601(m.getCreatedAt()));
        return vo;
    }

    /** 单条便捷版：自己查一次上传者（详情/重命名用） */
    private MaterialVO toMaterialVO(Material m) {
        User uploader = authService.getById(m.getUploadedBy());
        return toMaterialVO(m, uploader == null ? "" : uploader.getUsername());
    }

    /**
     * 删除无效对象
     * @param objectKey 对象键
     */
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
     * 生成预签名 URL
     * @param objectKey 对象键
     * @param method    HTTP 方法：PUT=前端直传上传，GET=下载
     * @return 预签名 URL
     */
    private String presignUrl(String objectKey, Method method) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(method)
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .expiry(minioProperties.getPresignExpireSeconds())
                            .build());
        } catch (Exception e) {
            log.error("生成预签名 URL 失败: objectKey={}, method={}", objectKey, method, e);
            throw new BizException(ErrorCode.INTERNAL_ERROR, "生成预签名地址失败");
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
