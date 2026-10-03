-- =============================================================================
--  智能课程助教平台 · 数据库建表脚本（MySQL 8）
-- =============================================================================
--  作者：星河一叶Roxy
--  仓库：https://github.com/RainxButterfly/SmartCourseTeachingAssistantPlatform
--  来源：《智能课程助教平台_PAD需求文档》v0.14 §8 数据模型
--  用途：后端（Java 微服务）建表依据；与 docs/api/openapi.yaml 配套
-- =============================================================================
--
--  【全局约定】
--  1. 表名 `t_*` 蛇形复数，字段蛇形；主键 `BIGINT UNSIGNED AUTO_INCREMENT`。
--  2. 字符集 utf8mb4 / utf8mb4_0900_ai_ci；引擎 InnoDB。
--  3. 所有时间字段为 DATETIME（非 TIMESTAMP），避免 2038 与时区隐式转换问题。
--  4. **枚举一律用 VARCHAR 存储，不用 MySQL ENUM** —— 便于扩展且避免 DDL 变更成本；
--     取值范围由应用层（DTO 契约）约束，详见 PAD §8「状态枚举」。
--  5. **不建外键约束** —— 删除资料/课程需要异步补偿清理 MinIO 与 Milvus，
--     级联行为由应用层显式控制（1006 冲突提示 + cascade 参数），外键会与补偿逻辑打架。
--  6. 除下述 2 张技术表外，业务表均带 `is_deleted` 软删标记（0=正常 1=已删）。
--  7. 金融/比率类数值统一用 DECIMAL 存储（0~1 的比率用 DECIMAL(4,3)），避免浮点误差。
--
--  【与 PAD §8 的三处补注（v0.14）】
--  ① `t_quiz_question` 增加 `user_answer` 列 —— 结果页（QuizResultVO.details）需要回显
--     「用户作答」，不在提交时落库就无法复现，PAD §9.7 的 `user_answer` 字段依赖此列。
--  ② `t_message` **不再保留 `feedback` 列** —— v0.6 起反馈的唯一事实源是 `t_feedback`
--     （`message_id` 唯一）；`MessageVO.feedback` 由 `t_feedback` LEFT JOIN 得到，
--     避免双写不一致。
--  ③ `t_feedback` / `t_token_blacklist` 不设 `is_deleted`：
--     - `t_feedback`：取消反馈（rating=null）语义上是**物理删除**该行；
--       若用软删，`UNIQUE(message_id)` 会导致「重新点赞」插入失败。
--     - `t_token_blacklist`：技术型临时表，行过期即由定时任务物理清理。
--
--  【片段存储分工（写死）】
--  业务元数据 → MySQL ｜ 资料原文 → MinIO ｜ 切片文本与向量 → Milvus 2.x
--  引用来源 → 随消息落 `t_message.citations`(JSON)，**不建 t_citation 表**
--  会话短期上下文 → Redis 滑动窗口，**不建 t_chunk 表**
--  大模型配置（API Key 等）→ 后端本地配置文件，**不落库**
-- =============================================================================

-- CREATE DATABASE IF NOT EXISTS smart_course_ta
--   DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- USE smart_course_ta;

SET NAMES utf8mb4;

-- =============================================================================
-- 1. t_user —— 用户
-- =============================================================================
CREATE TABLE IF NOT EXISTS `t_user` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户 ID',
  `email`         VARCHAR(128)    NOT NULL                COMMENT '登录邮箱，全局唯一',
  `username`      VARCHAR(20)     NOT NULL                COMMENT '用户名，2-20 字',
  `password_hash` VARCHAR(100)    NOT NULL                COMMENT '密码哈希（bcrypt，约 60 字符）',
  `avatar`        VARCHAR(500)    DEFAULT NULL            COMMENT '头像 URL，无则 NULL',
  `status`        TINYINT UNSIGNED NOT NULL DEFAULT 1     COMMENT '账号状态：1=正常 0=禁用',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`    TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户';

-- =============================================================================
-- 2. t_course —— 课程
-- =============================================================================
--  派生字段（不落库，由查询聚合或按需加缓存列）：
--    material_count / conversation_count / last_active_at（stats 一并聚合）
CREATE TABLE IF NOT EXISTS `t_course` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '课程 ID',
  `name`        VARCHAR(50)     NOT NULL                COMMENT '课程名称，2-50 字',
  `code`        VARCHAR(32)     NOT NULL                COMMENT '课程编号，2-32 位字母/数字/下划线/中划线，全局唯一',
  `semester`    VARCHAR(20)     NOT NULL DEFAULT ''     COMMENT '学期，可空串（空学期的课程不进学期字典）',
  `teacher`     VARCHAR(50)     NOT NULL DEFAULT ''     COMMENT '任课教师',
  `color`       CHAR(7)         NOT NULL DEFAULT '#7c9cff' COMMENT '封面主题色，6 位 HEX',
  `description` VARCHAR(200)    NOT NULL DEFAULT ''     COMMENT '课程简介',
  `visibility`  VARCHAR(16)     NOT NULL DEFAULT 'PRIVATE' COMMENT '可见性：PRIVATE=仅自己 PUBLIC=全部可见',
  `owner_id`    BIGINT UNSIGNED NOT NULL                COMMENT '创建者用户 ID',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_course_code` (`code`),
  KEY `idx_course_owner` (`owner_id`, `is_deleted`),
  KEY `idx_course_semester` (`semester`),
  KEY `idx_course_visibility` (`visibility`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '课程';

-- =============================================================================
-- 3. t_material —— 资料（MinIO 对象锚点）
-- =============================================================================
--  状态机：UPLOADING → PENDING → PARSING → EMBEDDING → READY / FAILED
--  presign 阶段即落 status=UPLOADING 的占位行；超 24h 未 complete 的占位行由定时任务回收
CREATE TABLE IF NOT EXISTS `t_material` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '资料 ID',
  `course_id`       BIGINT UNSIGNED NOT NULL                COMMENT '所属课程 ID',
  `name`            VARCHAR(255)    NOT NULL                COMMENT '展示名（可重命名）',
  `original_name`   VARCHAR(255)    NOT NULL                COMMENT '上传时的原始文件名（不可改）',
  `object_key`      VARCHAR(512)    NOT NULL                COMMENT 'MinIO 对象键，不存服务器绝对路径',
  `size_bytes`      BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '文件字节数（上限 52428800）',
  `page_count`      INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '页数，解析后回填',
  `format`          VARCHAR(8)      NOT NULL                COMMENT '格式：PDF / PPTX / DOCX / MD',
  `status`          VARCHAR(16)     NOT NULL DEFAULT 'UPLOADING' COMMENT '状态：UPLOADING/PENDING/PARSING/EMBEDDING/READY/FAILED',
  `error_msg`       VARCHAR(500)    DEFAULT NULL            COMMENT '失败原因，非 FAILED 为 NULL',
  `version`         INT UNSIGNED    NOT NULL DEFAULT 1      COMMENT '版本号，重新上传或重解析递增',
  `sha256`          CHAR(64)        DEFAULT NULL            COMMENT '文件 SHA-256，用于秒传/去重',
  `chunk_count`     INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '切片数，向量化完成后回填',
  `upload_batch_id` VARCHAR(64)     DEFAULT NULL            COMMENT '上传批次号（同一次 presign 共享）',
  `uploaded_by`     BIGINT UNSIGNED NOT NULL                COMMENT '上传者用户 ID',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`      TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_material_course` (`course_id`, `is_deleted`, `created_at`),
  KEY `idx_material_batch` (`upload_batch_id`),
  KEY `idx_material_status` (`status`),
  KEY `idx_material_sha256` (`sha256`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '资料（MinIO 锚点）';

-- =============================================================================
-- 4. t_parse_task —— 解析任务
-- =============================================================================
--  ParseStatusVO.stage（「向量化中」等展示文案）由 status + progress 推导，不落库
CREATE TABLE IF NOT EXISTS `t_parse_task` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '解析任务 ID',
  `material_id`    BIGINT UNSIGNED NOT NULL                COMMENT '关联资料 ID',
  `status`         VARCHAR(16)     NOT NULL DEFAULT 'QUEUED' COMMENT '状态：QUEUED/RUNNING/SUCCESS/FAILED',
  `progress`       TINYINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '进度百分比 0-100',
  `total_chunks`   INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '切片总数',
  `indexed_chunks` INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '已向量化的切片数',
  `error_msg`      VARCHAR(500)    DEFAULT NULL            COMMENT '失败原因',
  `started_at`     DATETIME        DEFAULT NULL            COMMENT '开始时间，未开始为 NULL',
  `finished_at`    DATETIME        DEFAULT NULL            COMMENT '结束时间，未结束为 NULL',
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`     TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_parse_task_material` (`material_id`, `is_deleted`),
  KEY `idx_parse_task_status` (`status`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '解析任务';

-- =============================================================================
-- 5. t_conversation —— 会话
-- =============================================================================
--  course_id = 0 表示检索范围为「全部资料」（不可为 NULL，避免与「未指定」混淆）
CREATE TABLE IF NOT EXISTS `t_conversation` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '会话 ID（对外为数字字符串）',
  `user_id`         BIGINT UNSIGNED NOT NULL                COMMENT '所属用户 ID',
  `course_id`       BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '检索范围课程 ID，0=全部资料',
  `title`           VARCHAR(100)    NOT NULL DEFAULT '新对话' COMMENT '会话标题',
  `message_count`   INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '消息条数',
  `last_message_at` DATETIME        DEFAULT NULL            COMMENT '最近一条消息时间',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`      TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_user` (`user_id`, `is_deleted`, `last_message_at`),
  KEY `idx_conversation_course` (`course_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '会话';

-- =============================================================================
-- 6. t_message —— 消息
-- =============================================================================
--  citations 直接存 JSON 数组（元素结构见 openapi.yaml 的 CitationVO），不建 t_citation 表
--  反馈不在本表：唯一事实源是 t_feedback，MessageVO.feedback 由 LEFT JOIN 得到
CREATE TABLE IF NOT EXISTS `t_message` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息 ID（对外为数字字符串）',
  `conversation_id` BIGINT UNSIGNED NOT NULL                COMMENT '所属会话 ID',
  `role`            VARCHAR(16)     NOT NULL                COMMENT '角色：USER / ASSISTANT / SYSTEM',
  `content`         MEDIUMTEXT      NOT NULL                COMMENT '消息正文（Markdown）',
  `tokens`          INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT 'token 消耗，USER 消息通常为 0',
  `citations`       JSON            DEFAULT NULL            COMMENT '引用来源数组（CitationVO[]），无引用为 NULL',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`      TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_message_conversation` (`conversation_id`, `is_deleted`, `id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '消息';

-- =============================================================================
-- 7. t_quiz_attempt —— 作答记录
-- =============================================================================
--  submitted_at IS NULL = 进行中；仅已提交可查结果（GET /quiz/attempts/{id}）
--  同一 attempt_id 只允许提交一次（应用层保证，重复提交返回 1005）
CREATE TABLE IF NOT EXISTS `t_quiz_attempt` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '作答记录 ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属用户 ID',
  `course_id`   BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '出题范围课程 ID，0=全部资料',
  `total`       INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '题目总数',
  `correct`     INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '答对题数',
  `score`       TINYINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '百分制得分 0-100 = round(correct/total*100)',
  `duration_ms` BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '作答用时（毫秒，前端实测）',
  `weak_points` JSON            DEFAULT NULL            COMMENT '本次识别出的薄弱知识点数组',
  `submitted_at` DATETIME       DEFAULT NULL            COMMENT '交卷时间；NULL=进行中',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_attempt_user` (`user_id`, `is_deleted`, `submitted_at`),
  KEY `idx_attempt_course` (`course_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '作答记录';

-- =============================================================================
-- 8. t_quiz_question —— 作答明细
-- =============================================================================
--  answer / explanation 仅服务端可见，不下发到组卷接口（防作弊），只在结果接口返回
--  user_answer 为 v0.14 补列：结果页需要回显用户作答，不在提交时落库无法复现
CREATE TABLE IF NOT EXISTS `t_quiz_question` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '题目 ID',
  `attempt_id`  BIGINT UNSIGNED NOT NULL                COMMENT '所属作答记录 ID',
  `type`        VARCHAR(16)     NOT NULL                COMMENT '题型：SINGLE/MULTIPLE/FILL/ESSAY',
  `stem`        TEXT            NOT NULL                COMMENT '题干',
  `options`     JSON            DEFAULT NULL            COMMENT '选项文本数组；FILL/ESSAY 为 []',
  `answer`      TEXT            NOT NULL                COMMENT '正确答案（服务端可见，多选为选项文本数组的 JSON）',
  `explanation` TEXT            DEFAULT NULL            COMMENT '解析文案',
  `citation`    JSON            DEFAULT NULL            COMMENT '题目依据的资料出处（QuizCitationVO[]）',
  `user_answer` VARCHAR(2000)   DEFAULT NULL            COMMENT '用户作答展示串（多选按「、」连接）；未作答为 NULL',
  `is_correct`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '本题是否判对；简答由模型评分 ≥0.6 视为正确',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_question_attempt` (`attempt_id`, `is_deleted`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '作答明细';

-- =============================================================================
-- 9. t_weak_point —— 薄弱知识点
-- =============================================================================
--  score 为掌握度 0~1，越低越薄弱；按 score 升序取最多 20 条
--  同一 (user_id, course_id, point_name) 只有一行，故用唯一键而非重复插入
--  高并发场景可用 Redis ZSet 做辅助排序，MySQL 侧仍是事实源
CREATE TABLE IF NOT EXISTS `t_weak_point` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id`    BIGINT UNSIGNED NOT NULL                COMMENT '用户 ID',
  `course_id`  BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '课程 ID，0=全部资料',
  `point_name` VARCHAR(100)    NOT NULL                COMMENT '知识点名称',
  `score`      DECIMAL(4, 3)   NOT NULL DEFAULT 0.000  COMMENT '掌握度 0~1，越低越薄弱',
  `weight`     DECIMAL(4, 3)   NOT NULL DEFAULT 0.000  COMMENT '权重 0~1（该知识点在课程中的占比）',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_weak_point` (`user_id`, `course_id`, `point_name`),
  KEY `idx_weak_point_rank` (`user_id`, `is_deleted`, `score`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '薄弱知识点';

-- =============================================================================
-- 10. t_activity —— 活动流
-- =============================================================================
--  title 在业务事务内**写入时**生成并落库，避免读时跨 target_type 表拼接
--  target_id 用 VARCHAR：既可能是数值主键（资料/课程），也可能是数字字符串（会话）
--  仅 5 类 type：COURSE_CREATED / MATERIAL_UPLOADED / MATERIAL_DELETED / QUIZ_SUBMITTED / CHAT_ASKED
CREATE TABLE IF NOT EXISTS `t_activity` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '活动 ID',
  `user_id`     BIGINT UNSIGNED NOT NULL                COMMENT '所属用户 ID',
  `type`        VARCHAR(32)     NOT NULL                COMMENT '活动类型（5 类，见 PAD §8 写入时机清单）',
  `target_id`   VARCHAR(64)     NOT NULL                COMMENT '关联目标 ID（字符串）',
  `target_type` VARCHAR(32)     NOT NULL                COMMENT '关联目标类型：COURSE/MATERIAL/QUIZ_ATTEMPT/CONVERSATION',
  `title`       VARCHAR(255)    NOT NULL                COMMENT '可直接展示的文案，写入时生成',
  `payload`     JSON            DEFAULT NULL            COMMENT '附加载荷；前端不解析，仅留档',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '软删：0=正常 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_activity_user_time` (`user_id`, `is_deleted`, `created_at`),
  KEY `idx_activity_user_type` (`user_id`, `type`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '活动流';

-- =============================================================================
-- 11. t_feedback —— 问答反馈
-- =============================================================================
--  **一条消息至多一条反馈**：UNIQUE(message_id) 是硬约束（PAD v0.6 写死）
--  幂等替换 UP/DOWN 直接 UPDATE；rating=null（取消反馈）语义为**物理删除该行**；
--  因此本表不设 is_deleted —— 软删会让「取消后重新点赞」撞 UNIQUE(message_id)
--  仅 ASSISTANT 消息可反馈（应用层校验，对 USER 消息返回 1001）
CREATE TABLE IF NOT EXISTS `t_feedback` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '反馈 ID',
  `message_id` BIGINT UNSIGNED NOT NULL                COMMENT '被反馈的消息 ID（助手消息）',
  `rating`     VARCHAR(8)      NOT NULL                COMMENT '反馈：UP=赞同 DOWN=反对',
  `comment`    VARCHAR(500)    DEFAULT NULL            COMMENT '补充说明，最多 500 字',
  `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feedback_message` (`message_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '问答反馈（一条消息至多一条）';

-- =============================================================================
-- 12. t_token_blacklist —— 作废 token 黑名单
-- =============================================================================
--  三类场景共用（PAD v0.13 / v0.14）：
--    ① 登出：吊销 refresh token
--    ② refresh 轮换：作废用掉的旧 refresh jti
--    ③ 改密码：吊销该用户**全部** refresh token（含当前）
--  校验 refresh 时先查本表，命中即返回 1002（HTTP 401）
--  expire_at 取该 token 的自然过期时间，过期行由定时任务物理清理
--  技术型临时表，不设 updated_at / is_deleted
CREATE TABLE IF NOT EXISTS `t_token_blacklist` (
  `jti`        VARCHAR(64) NOT NULL COMMENT 'JWT 的 jti 声明（作废 token 的唯一标识）',
  `expire_at`  DATETIME    NOT NULL COMMENT '该 token 的自然过期时间，到期即可清理',
  `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入黑名单时间',
  PRIMARY KEY (`jti`),
  KEY `idx_blacklist_expire` (`expire_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '作废 token 黑名单';

-- =============================================================================
--  表清单速查
-- =============================================================================
--  | 表名                | 说明                                   | 关键约束                          |
--  |---------------------|----------------------------------------|-----------------------------------|
--  | t_user              | 用户                                   | uk(email)                         |
--  | t_course            | 课程                                   | uk(code)                          |
--  | t_material          | 资料（MinIO 锚点）                     | ix(course_id, created_at)         |
--  | t_parse_task        | 解析任务                               | ix(material_id)                   |
--  | t_conversation      | 会话                                   | ix(user_id, last_message_at)      |
--  | t_message           | 消息（引用随消息存 JSON）              | ix(conversation_id, id)           |
--  | t_quiz_attempt      | 作答记录（submitted_at 为空=进行中）   | ix(user_id, submitted_at)         |
--  | t_quiz_question     | 作答明细（含答案，仅服务端）           | ix(attempt_id)                    |
--  | t_weak_point        | 薄弱知识点                             | uk(user_id, course_id, point_name)|
--  | t_activity          | 活动流（title 写入时生成）             | ix(user_id, created_at)           |
--  | t_feedback          | 问答反馈                               | **uk(message_id)**                |
--  | t_token_blacklist   | 登出 / 轮换 / 改密码的作废 token       | pk(jti)                           |
--
--  【不落库的数据】
--  | 数据                            | 存储位置                     |
--  |---------------------------------|------------------------------|
--  | 资料原文                        | MinIO（object_key 指向）     |
--  | 切片文本 + 向量 + chunk 元数据  | Milvus 2.x（不建 t_chunk）   |
--  | 引用来源                        | t_message.citations (JSON)   |
--  | 会话短期上下文                  | Redis 滑动窗口               |
--  | 大模型 API 地址 / 模型名 / Key  | 后端本地配置文件（0600）     |
--
--  【定时任务（建议）】
--  1. 清理 t_token_blacklist 中 expire_at < NOW() 的行（每小时）。
--  2. 回收 t_material 中 status='UPLOADING' 且 created_at < NOW() - INTERVAL 24 HOUR
--     的僵尸占位行，并清理对应 MinIO 残留对象（每天）。
-- =============================================================================