package com.course.backend.modules.stats.dto.response;

import lombok.Data;

/**
 * 课程统计快照 —— stats 模块的**内部数据模型**，不是对外契约。
 *
 * <p>为什么要单独一个类，而不是直接返回 course 模块的 {@code CourseStatsVO}：
 * <ul>
 *   <li><b>依赖方向</b>：course → stats 是单向依赖。若 stats 反过来引用 course 的 VO，
 *       就形成包级循环依赖，将来拆服务时两边都拆不干净。</li>
 *   <li><b>职责分离</b>：{@code CourseStatsVO} 是「对外契约」（改它要回写 PAD，前端依赖）；
 *       本类是「内部实现」（可以随时改字段、加缓存标记、加数据来源）。</li>
 *   <li><b>为拆分做准备</b>：将来 stats 变成独立服务时，本类就是远程响应的反序列化目标，
 *       course 模块的映射代码一行不用改。</li>
 * </ul>
 *
 * <p>字段全部给默认值 0：聚合函数（如 AVG）在无数据时返回 NULL，
 * 而契约里这些字段都是**必填非空数字**，默认值兜住最坏情况。
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/23
 */
@Data
public class CourseStatsSnapshot {

    /** 资料总数 */
    private Integer materialCount = 0;

    /** 已完成解析（READY）的资料数 */
    private Integer readyMaterialCount = 0;

    /** 会话总数 */
    private Integer conversationCount = 0;

    /** 累计提问数（当前用户在该课程下发出的 USER 消息数） */
    private Integer questionCount = 0;

    /** 练习正确率 0~1；无已提交作答时为 0 */
    private Float quizAccuracy = 0f;

    /** 最近活跃时间（ISO-8601）；口径待定，暂为 null */
    private String lastActiveAt;
}
