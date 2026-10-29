package com.course.backend.modules.conversation.service;

import com.course.backend.modules.conversation.entity.Conversation;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 会话 服务类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
public interface IConversationService extends IService<Conversation> {

    void deleteByCourseId(Long id);
}
