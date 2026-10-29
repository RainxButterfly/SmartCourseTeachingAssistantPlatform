package com.course.backend.modules.conversation.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.course.backend.modules.conversation.entity.Conversation;
import com.course.backend.modules.conversation.mapper.ConversationMapper;
import com.course.backend.modules.conversation.service.IConversationService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 会话 服务实现类
 * </p>
 *
 * @author StarLeaf·Roxy
 * @since 2026-10-23
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ConversationServiceImpl extends ServiceImpl<ConversationMapper, Conversation> implements IConversationService {

    @Override
    public void deleteByCourseId(Long id) {
        boolean remove = this.remove(Wrappers.lambdaQuery(Conversation.class).eq(Conversation::getCourseId, id));
        if (remove) {
            log.info("删除课程{}下的所有会话", id);
        } else {
            log.info("删除课程{}下的所有会话失败", id);
        }
    }
}
