import type { Conversation } from '@/schemas/conversation'

export const conversationFixtures: Conversation[] = [
  {
    id: '1',
    title: '内存管理相关问题',
    course_id: 1,
    course_name: '操作系统',
    message_count: 8,
    last_message_at: '2026-10-02T09:40:00',
    created_at: '2026-10-01T21:10:00',
  },
  {
    id: '2',
    title: '分页与分段的区别',
    course_id: 1,
    course_name: '操作系统',
    message_count: 4,
    last_message_at: '2026-10-01T22:05:00',
    created_at: '2026-10-01T22:00:00',
  },
  {
    id: '3',
    title: '红黑树插入旋转讲解',
    course_id: 2,
    course_name: '数据结构与算法',
    message_count: 12,
    last_message_at: '2026-10-01T20:15:00',
    created_at: '2026-09-30T19:30:00',
  },
  {
    id: '4',
    title: '跨课程综合提问',
    course_id: 0,
    course_name: '全部资料',
    message_count: 6,
    last_message_at: '2026-09-29T15:20:00',
    created_at: '2026-09-29T15:00:00',
  },
]
