import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatComposer } from '@/features/chat/components/chat-composer'
import { ChatEmptyState } from '@/features/chat/components/chat-empty-state'
import { ChatMessageItem } from '@/features/chat/components/chat-message-item'
import {
  ALL_MATERIALS_SCOPE,
  CourseScopeSelect,
} from '@/features/chat/components/course-scope-select'
import { type ChatUiMessage, useChatStream } from '@/features/chat/use-chat-stream'
import { useConversationDetailQuery, useMessageListQuery } from '@/features/conversation/queries'
import { resolveErrorMessage } from '@/lib/http'
import type { FeedbackRating, Message } from '@/schemas/conversation'

const EMPTY_MESSAGES: Message[] = []

/** 历史消息 → 渲染模型：已落库的消息一律视为终态 */
function toChatUiMessage(message: Message): ChatUiMessage {
  return {
    id: message.id,
    serverMessageId: message.id,
    role: message.role === 'USER' ? 'USER' : 'ASSISTANT',
    content: message.content,
    citations: message.citations,
    feedback: message.feedback,
    status: 'done',
    notice: null,
    errorCode: null,
  }
}

interface ChatWindowProps {
  /** URL 中的会话 ID；null 表示「新对话」 */
  conversationId: string | null
}

/**
 * 中栏消息流（PAD §6.2 ChatPage）：
 * 历史消息来自 query、本次流式消息来自 useChatStream，渲染时拼接；
 * 切换会话由外层用 key 强制重挂载，避免把上一段对话的消息带过来。
 */
export function ChatWindow({ conversationId }: ChatWindowProps) {
  const navigate = useNavigate()
  const detailQuery = useConversationDetailQuery(conversationId)
  const messagesQuery = useMessageListQuery(conversationId)

  const [scopeCourseId, setScopeCourseId] = useState<number>(ALL_MATERIALS_SCOPE)
  // 既有会话的检索范围由会话决定，不随选择器漂移
  const courseId =
    conversationId === null ? scopeCourseId : (detailQuery.data?.course_id ?? ALL_MATERIALS_SCOPE)

  const {
    messages: liveMessages,
    isStreaming,
    send,
    stop,
    setFeedback,
  } = useChatStream({ courseId, conversationId })

  const historyMessages = useMemo(
    () =>
      (messagesQuery.data?.list ?? EMPTY_MESSAGES)
        .filter((message) => message.role !== 'SYSTEM')
        .map(toChatUiMessage),
    [messagesQuery.data],
  )
  const messages = useMemo(
    () => [...historyMessages, ...liveMessages],
    [historyMessages, liveMessages],
  )

  const handleFeedbackChange = useCallback(
    (messageId: string, rating: FeedbackRating | null) => setFeedback(messageId, rating),
    [setFeedback],
  )

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (messages.length === 0) return
    const viewport = listRef.current?.closest('[data-slot="scroll-area-viewport"]')
    if (!(viewport instanceof HTMLElement)) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages])

  const total = messagesQuery.data?.total ?? 0
  const loaded = messagesQuery.data?.list.length ?? 0
  const loadingHistory = conversationId !== null && messagesQuery.isPending

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <h1 className="truncate font-medium">
            {conversationId === null ? '新对话' : (detailQuery.data?.title ?? '加载中…')}
          </h1>
          {conversationId === null ? (
            <p className="text-muted-foreground text-xs">选择检索范围后开始提问</p>
          ) : (
            <p className="truncate text-muted-foreground text-xs">
              检索范围：{detailQuery.data?.course_name ?? '加载中…'}
            </p>
          )}
        </div>

        {conversationId === null ? (
          <CourseScopeSelect value={scopeCourseId} onChange={setScopeCourseId} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/chat')}>
            <RotateCcw aria-hidden="true" />
            新对话
          </Button>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {loadingHistory ? (
          <div className="space-y-3 p-4" aria-hidden="true">
            <Skeleton className="ml-auto h-9 w-2/5" />
            <Skeleton className="h-20 w-4/5" />
            <Skeleton className="ml-auto h-9 w-1/3" />
          </div>
        ) : messagesQuery.isError ? (
          <div role="alert" className="p-4">
            <p className="font-medium text-destructive text-sm">消息加载失败</p>
            <p className="mt-1 text-muted-foreground text-sm">
              {resolveErrorMessage(messagesQuery.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void messagesQuery.refetch()}
            >
              重试
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <ChatEmptyState
              courseId={courseId}
              title={conversationId === null ? '开始一段新对话' : '这段对话还没有消息'}
              description="可以指定检索范围，回答会标注引用出处与页码。"
              onPick={(question) => void send(question)}
            />
          </div>
        ) : (
          <div ref={listRef} className="space-y-4 p-4">
            {messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                onFeedbackChange={handleFeedbackChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {total > loaded ? (
        <p className="border-t border-border px-3 py-1 text-center text-muted-foreground text-xs">
          仅显示最近 {loaded} 条消息
        </p>
      ) : null}

      <div className="border-t border-border p-3">
        <ChatComposer
          isStreaming={isStreaming}
          onSend={(question) => void send(question)}
          onStop={stop}
        />
      </div>
    </section>
  )
}
