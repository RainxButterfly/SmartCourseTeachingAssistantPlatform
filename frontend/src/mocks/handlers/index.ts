import { authHandlers } from '@/mocks/handlers/auth'
import { chatHandlers } from '@/mocks/handlers/chat'
import { conversationHandlers } from '@/mocks/handlers/conversation'
import { courseHandlers } from '@/mocks/handlers/course'
import { materialHandlers } from '@/mocks/handlers/material'
import { quizHandlers } from '@/mocks/handlers/quiz'
import { settingsHandlers } from '@/mocks/handlers/settings'
import { statsHandlers } from '@/mocks/handlers/stats'

/**
 * MSW handler 聚合入口。
 * 新增模块时在此追加 handler 数组即可，browser.ts 无需改动。
 */
export const handlers = [
  ...authHandlers,
  ...courseHandlers,
  ...materialHandlers,
  ...conversationHandlers,
  ...chatHandlers,
  ...quizHandlers,
  ...statsHandlers,
  ...settingsHandlers,
]
