import { create } from 'zustand'

export type ChatStreamStatus = 'idle' | 'streaming'

/**
 * 问答的客户端状态（PAD §6.4）：当前会话、流式状态、是否中断。
 * 消息列表本身留在组件本地 state，避免高频 chunk 触发全局订阅者重渲染。
 */
interface ChatState {
  /** 当前会话所属课程；切换课程时自动清空上下文，避免跨课程串话 */
  courseId: number | null
  /** 后端会话 ID；为 null 表示下一问由后端新建会话 */
  conversationId: string | null
  status: ChatStreamStatus
  /** 上一次生成是否被用户主动中断 */
  interrupted: boolean
  /** 「新对话」序号：/chat 路由靠它强制重挂载消息区，清掉上一轮上下文 */
  newChatNonce: number
  bindCourse: (courseId: number) => void
  setConversationId: (conversationId: string) => void
  beginStream: () => void
  endStream: (interrupted: boolean) => void
  startNewConversation: () => void
  /** /chat 页点「新建」：不预先建会话，由首次提问隐式创建 */
  startNewChat: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  courseId: null,
  conversationId: null,
  status: 'idle',
  interrupted: false,
  newChatNonce: 0,
  bindCourse: (courseId) => {
    if (get().courseId === courseId) return
    set({ courseId, conversationId: null, status: 'idle', interrupted: false })
  },
  setConversationId: (conversationId) => set({ conversationId }),
  beginStream: () => set({ status: 'streaming', interrupted: false }),
  endStream: (interrupted) => set({ status: 'idle', interrupted }),
  startNewConversation: () => set({ conversationId: null, interrupted: false }),
  startNewChat: () => set((state) => ({ newChatNonce: state.newChatNonce + 1 })),
}))
