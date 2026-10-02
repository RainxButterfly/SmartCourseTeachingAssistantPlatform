import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { courseFixtures } from '@/mocks/fixtures/courses'
import { materialFixtures } from '@/mocks/fixtures/materials'
import type { Conversation, FeedbackRating, Message } from '@/schemas/conversation'
import type { Course } from '@/schemas/course'
import type { Material, ParseStatus } from '@/schemas/material'
import type { ModelProvider } from '@/schemas/settings'

/**
 * MSW 内存数据库：让 mock 具备真实的增删改查语义，
 * 契约字段与 PAD §7 / §9 完全一致，后端联调时只需把 VITE_ENABLE_MOCK 关掉。
 */

/** 大模型配置的 mock 持久化形态：明文密钥只存在于 mock 内存，真实后端落受保护的配置文件 */
interface ModelConfigRecord {
  provider: ModelProvider
  base_url: string
  model: string
  api_key: string
  updated_at: string
}

interface MockDatabase {
  courses: Course[]
  materials: Material[]
  conversations: Conversation[]
  /** 流式问答落库的消息（夹具会话的消息由 buildMockMessages 按需合成） */
  messages: Message[]
  parseStatusByMaterial: Record<number, ParseStatus>
  /** 问答反馈：key 为消息 id，value 为 UP/DOWN；无记录表示未反馈 */
  feedbackByMessage: Record<string, FeedbackRating>
  modelConfig: ModelConfigRecord
  sequences: {
    course: number
    material: number
    conversation: number
    task: number
  }
}

/** 默认给出一份「已配置」的演示配置，便于展示掩码回显与问答链路；测试可据此复位 */
export const DEFAULT_MODEL_CONFIG: ModelConfigRecord = {
  provider: 'DEEPSEEK',
  base_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  api_key: 'sk-mock-0000000000000000f3a1',
  updated_at: '2026-10-02T09:00:00',
}

export const db: MockDatabase = {
  courses: courseFixtures.map((item) => ({ ...item })),
  materials: materialFixtures.map((item) => ({ ...item })),
  conversations: conversationFixtures.map((item) => ({ ...item })),
  messages: [],
  parseStatusByMaterial: {
    103: {
      task_id: 501,
      material_id: 103,
      status: 'RUNNING',
      progress: 62,
      total_chunks: 410,
      indexed_chunks: 254,
      stage: '向量化中',
      error_msg: null,
      started_at: '2026-10-02T09:36:00',
      finished_at: null,
    },
    202: {
      task_id: 502,
      material_id: 202,
      status: 'RUNNING',
      progress: 18,
      total_chunks: 0,
      indexed_chunks: 0,
      stage: '解析中',
      error_msg: null,
      started_at: '2026-10-02T09:41:00',
      finished_at: null,
    },
    101: {
      task_id: 401,
      material_id: 101,
      status: 'SUCCESS',
      progress: 100,
      total_chunks: 320,
      indexed_chunks: 320,
      stage: '已完成',
      error_msg: null,
      started_at: '2026-09-20T10:21:00',
      finished_at: '2026-09-20T10:23:40',
    },
    104: {
      task_id: 403,
      material_id: 104,
      status: 'FAILED',
      progress: 34,
      total_chunks: 0,
      indexed_chunks: 0,
      stage: '解析失败',
      error_msg: '文档内含加密内容，无法提取文本，请重新导出后重试',
      started_at: '2026-10-01T18:03:00',
      finished_at: '2026-10-01T18:03:22',
    },
  },
  sequences: {
    course: 1000,
    material: 1000,
    conversation: 1000,
    task: 1000,
  },
  feedbackByMessage: {},
  modelConfig: { ...DEFAULT_MODEL_CONFIG },
}

export function nextSequence(key: keyof MockDatabase['sequences']): number {
  db.sequences[key] += 1
  return db.sequences[key]
}

/** 冗余计数保持与明细一致，避免 mock 与真实后端行为偏差 */
export function syncCourseCounters(courseId: number): void {
  const course = db.courses.find((item) => item.id === courseId)
  if (!course) return

  course.material_count = db.materials.filter((item) => item.course_id === courseId).length
  course.conversation_count = db.conversations.filter((item) => item.course_id === courseId).length
}

/** 载入一份带当前时间的 ISO 字符串（后端返回本地时间格式） */
export function nowIso(): string {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
