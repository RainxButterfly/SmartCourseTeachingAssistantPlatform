import type { ConversationListQuery } from '@/schemas/conversation'
import type { CourseListQuery } from '@/schemas/course'
import type { MaterialListQuery } from '@/schemas/material'
import type { QuizAttemptListQuery } from '@/schemas/quiz'

/**
 * TanStack Query key 工厂 —— 所有 query key 必须从这里取，禁止在组件内手写字符串数组。
 * 命名遵循 `queryKeys.<feature>.<scope>(params)`。
 */
export const queryKeys = {
  auth: {
    all: () => ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },

  courses: {
    all: () => ['courses'] as const,
    list: (query: CourseListQuery) => ['courses', 'list', query] as const,
    semesters: () => ['courses', 'semesters'] as const,
    detail: (id: number) => ['courses', 'detail', id] as const,
    stats: (id: number) => ['courses', 'stats', id] as const,
  },

  materials: {
    all: () => ['materials'] as const,
    /** 按课程维度缓存，便于上传/删除后精准失效 */
    list: (courseId: number, query: MaterialListQuery) =>
      ['materials', 'list', courseId, query] as const,
    detail: (id: number) => ['materials', 'detail', id] as const,
    /** 解析进度轮询 key，与列表分离避免整表重渲染 */
    parseStatus: (materialId: number) => ['materials', 'parse-status', materialId] as const,
  },

  conversations: {
    all: () => ['conversations'] as const,
    /** 只覆盖「会话列表」，不牵连消息缓存（消息 key 前缀为 conversations/messages） */
    lists: () => ['conversations', 'list'] as const,
    list: (query: ConversationListQuery) => ['conversations', 'list', query] as const,
    detail: (id: string) => ['conversations', 'detail', id] as const,
    messages: (id: string, page: number) => ['conversations', 'messages', id, page] as const,
  },

  chat: {
    suggestions: (courseId: number) => ['chat', 'suggestions', courseId] as const,
  },

  quiz: {
    all: () => ['quiz'] as const,
    weakPoints: (courseId: number) => ['quiz', 'weak-points', courseId] as const,
    attempt: (attemptId: number) => ['quiz', 'attempt', attemptId] as const,
    attempts: (query: QuizAttemptListQuery) => ['quiz', 'attempts', query] as const,
  },

  stats: {
    all: () => ['stats'] as const,
    overview: () => ['stats', 'overview'] as const,
    trend: (type: string, range: string) => ['stats', 'trend', type, range] as const,
    activities: () => ['stats', 'activities'] as const,
  },

  settings: {
    all: () => ['settings'] as const,
    model: () => ['settings', 'model'] as const,
  },
} as const
