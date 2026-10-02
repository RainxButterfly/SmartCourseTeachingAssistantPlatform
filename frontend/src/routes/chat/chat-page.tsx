import { useParams } from 'react-router'
import { ChatWindow } from '@/features/chat/components/chat-window'
import { CitationDrawer } from '@/features/chat/components/citation-drawer'
import { ConversationList } from '@/features/conversation/components/conversation-list'
import { useChatStore } from '@/stores/chat-store'

/**
 * 知识库问答页（PAD §6.1 路由表 / §6.2 ChatPage）：
 * 左 会话列表 + 中 消息流 + 右 引用详情栏（窄屏为浮层抽屉）。
 * `/chat` 表示新对话，`/chat/:conversationId` 打开既有会话。
 */
export function ChatPage() {
  const { conversationId } = useParams()
  const activeId = conversationId ?? null
  const newChatNonce = useChatStore((state) => state.newChatNonce)

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-xl border border-border">
      <ConversationList activeId={activeId} />
      {/* key 绑会话 + 新建序号：切换会话或点「新建」都重挂载，丢弃上一轮的本地消息 */}
      <ChatWindow key={activeId ?? `new-${newChatNonce}`} conversationId={activeId} />
      <CitationDrawer />
    </div>
  )
}
