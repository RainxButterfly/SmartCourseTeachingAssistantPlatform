package com.course.backend.common.constant;

import java.util.Set;

/**
 * 契约硬约束常量 —— 与《智能课程助教平台_PAD需求文档》§7 / docs/api/openapi.yaml 一一对应。
 *
 * <p>为什么集中放一个类：
 * <ol>
 *   <li>前后端契约里的「上限/默认值」散落在接口文档里，后端校验时如果每个地方写死数字，
 *       将来契约调整会漏改；集中成常量后，校验逻辑只引用常量名。</li>
 *   <li>常量名即注释 —— 看到 {@link #MAX_PAGE_SIZE} 就知道「分页 size 上限 50」这条契约。</li>
 * </ol>
 *
 * 使用方法：校验类里直接 {@code ContractConstants.MAX_PAGE_SIZE}，不要自己再定义一遍数字。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/16
 */
public final class ContractConstants {

    private ContractConstants() {
        // 工具类：禁止实例化（构造私有），也禁止被继承（final）
    }

    // ─────────────────────────── 分页 ───────────────────────────
    /** 分页 size 上限（契约写死 ≤ 50） */
    public static final int MAX_PAGE_SIZE = 50;
    /** 资料列表默认每页条数（GET /courses/{id}/materials，默认 10） */
    public static final int DEFAULT_MATERIAL_PAGE_SIZE = 10;
    /** 消息分页默认每页条数（GET /conversations/{id}/messages，默认 50） */
    public static final int DEFAULT_MESSAGE_PAGE_SIZE = 50;
    /** 会话列表默认每页条数（GET /conversations，默认 12） */
    public static final int DEFAULT_CONVERSATION_PAGE_SIZE = 12;
    /** 活动流默认条数（GET /stats/activities，默认 10） */
    public static final int DEFAULT_ACTIVITY_LIMIT = 10;

    // ─────────────────────────── 流式问答 ───────────────────────────
    /** 携带最近 N 轮上下文的**上限**（契约写死 ≤ 20） */
    public static final int MAX_HISTORY_LIMIT = 20;
    /** 上下文轮数默认值（契约写死默认 6） */
    public static final int DEFAULT_HISTORY_LIMIT = 6;
    /** 用户问题最大长度（≤ 2000 字） */
    public static final int MAX_QUESTION_LENGTH = 2000;

    // ─────────────────────────── 智能出题 ───────────────────────────
    /** 单次组卷最少题数（≥ 1） */
    public static final int MIN_QUIZ_COUNT = 1;
    /** 单次组卷最多题数（≤ 20） */
    public static final int MAX_QUIZ_COUNT = 20;

    // ─────────────────────────── 资料上传（MinIO 预签名三步走） ───────────────────────────
    /** 单文件大小上限：52428800 字节 = 50MB（契约写死；对应错误码 2001） */
    public static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    /** 单次 presign 最多申请的文件数（写死 10 个） */
    public static final int MAX_FILES_PER_BATCH = 10;
    /** 预签名 URL 有效期（秒），契约写死 900 */
    public static final int PRESIGN_EXPIRE_SECONDS = 900;
    /**
     * 允许上传的格式白名单（契约 2002 写死仅这 4 种）。
     * 用 Set 而不是 List：判断「是否允许」是 contains 语义，Set 的 contains 是 O(1)。
     * 校验时请先把扩展名 toLowerCase() 再比对（前端可能是大写 PDF）。
     */
    public static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "pptx", "md");
    /** 上传失败允许对同一 material_id 重新 presign 的最大次数（写死 3 次） */
    public static final int MAX_PRESIGN_RETRY = 3;
    /** 僵尸上传占位行回收阈值（小时），写死 24h */
    public static final int ZOMBIE_UPLOAD_THRESHOLD_HOURS = 24;
}
