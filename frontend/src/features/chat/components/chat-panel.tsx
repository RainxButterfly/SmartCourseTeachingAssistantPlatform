import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatComposer } from '@/features/chat/components/chat-composer'
import { ChatEmptyState } from '@/features/chat/components/chat-empty-state'
import { ChatMessageItem } from '@/features/chat/components/chat-message-item'
import { useChatStream } from '@/features/chat/use-chat-stream'
import type { FeedbackRating } from '@/schemas/conversation'
import { useChatStore } from '@/stores/chat-store'

interface ChatPanelProps {
  /** 检索范围：默认限定该课程资料（PAD §6.2） */
  courseId: number
}

export function ChatPanel({ courseId }: ChatPanelProps) {
  const bindCourse = useChatStore((state) => state.bindCourse)
  const conversationId = useChatStore((state) => state.conversationId)
  const setConversationId = useChatStore((state) => state.setConversationId)
  const startNewConversation = useChatStore((state) => state.startNewConversation)
  const { messages, isStreaming, send, stop, setFeedback, reset } = useChatStream({
    courseId,
    conversationId,
    onConversationCreated: setConversationId,
  })
  const listRef = useRef<HTMLDivElement>(null)

  // 「新对话」= 清空消息 + 丢弃 store 里的会话上下文
  const handleNewConversation = useCallback((): void => {
    reset()
    startNewConversation()
  }, [reset, startNewConversation])

  // 稳定引用：避免反馈回调每次渲染换新，破坏 ChatMessageItem 的 memo
  const handleFeedbackChange = useCallback(
    (messageId: string, rating: FeedbackRating | null) => setFeedback(messageId, rating),
    [setFeedback],
  )

  // 切换课程时丢弃上一门课的会话上下文
  useEffect(() => {
    bindCourse(courseId)
  }, [bindCourse, courseId])

  // 新内容到达后贴底：只滚动消息区自身。
  // 用 scrollIntoView 会连外层页面一起滚走，导致「停止生成」在流式期间不可点。
  useEffect(() => {
    if (messages.length === 0) return
    const viewport = listRef.current?.closest('[data-slot="scroll-area-viewport"]')
    if (!(viewport instanceof HTMLElement)) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">课程问答</h2>
          <Badge variant="outline">限定本课程资料</Badge>
        </div>
        {messages.length === 0 ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isStreaming}
            onClick={handleNewConversation}
          >
            <RotateCcw aria-hidden="true" />
            新对话
          </Button>
        )}
      </div>

      <ScrollArea
        className="rounded-xl border border-border"
        // 高度随视口收缩，保证输入框与「停止生成」始终落在首屏内
        style={{ height: 'clamp(16rem, calc(100dvh - 26rem), 26rem)' }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <ChatEmptyState
              courseId={courseId}
              title="向这门课的资料提问"
              description="回答会标注引用出处与页码，检索范围限定在本课程已解析的资料内。"
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

      <ChatComposer
        isStreaming={isStreaming}
        onSend={(question) => void send(question)}
        onStop={stop}
      />
    </section>
  )
}
