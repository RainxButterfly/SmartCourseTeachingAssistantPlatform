package com.course.backend.common.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 *
 * @author StarLeaf-Roxy
 * @since 2026/10/20
 */

@Getter
@RequiredArgsConstructor
public enum ActivityType {
    /** 创建课程成功 */
    COURSE_CREATED("COURSE_CREATED", "COURSE"),
    /** 资料解析完成 */
    MATERIAL_UPLOADED("MATERIAL_UPLOADED", "MATERIAL"),
    /** 删除资料成功 */
    MATERIAL_DELETED("MATERIAL_DELETED", "MATERIAL"),
    /** 交卷成功 */
    QUIZ_SUBMITTED("QUIZ_SUBMITTED", "QUIZ_ATTEMPT"),
    /** 会话内首次提问 */
    CHAT_ASKED("CHAT_ASKED", "CONVERSATION");


    /** 契约值（落 t_activity.type） */
    private final String value;
    /** 契约值（落 t_activity.target_type），与 type 一一对应 */
    private final String targetType;
}
