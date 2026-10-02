import { Check, Copy, Loader2, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import { memo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { CitationCard } from '@/features/chat/components/citation-card'
import { useFeedbackMutation } from '@/features/chat/queries'
import type { ChatUiMessage } from '@/features/chat/use-chat-stream'
import { cn } from '@/lib/utils'
import { ERROR_CODES } from '@/schemas/common'
import type { FeedbackRating } from '@/schemas/conversation'

interface ChatMessageItemProps {
  message: ChatUiMessage
  /** 反馈写回成功后的回调，由容器更新消息态（本地 state 或 query 缓存） */
  onFeedbackChange: (messageId: string, rating: FeedbackRating | null) => void
}

/**
 * 单条消息气泡：用户右、助手左。
 * 用 React.memo 隔离流式更新 —— chunk 只改助手那条消息的 props，其余行不重渲染（PAD §6.2）。
 */
export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  onFeedbackChange,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false)
  const feedbackMutation = useFeedbackMutation()

  if (message.role === 'USER') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground text-sm">
          {message.content}
        </p>
      </div>
    )
  }

  const copyAnswer = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('复制失败，请手动选择文本')
    }
  }

  // 再次点击同一项即取消（PAD §6.2）
  const toggleFeedback = (rating: FeedbackRating): void => {
    const serverMessageId = message.serverMessageId
    if (serverMessageId === null) return

    feedbackMutation.mutate(
      { messageId: serverMessageId, rating: message.feedback === rating ? null : rating },
      { onSuccess: (data) => onFeedbackChange(message.id, data.feedback) },
    )
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[92%] space-y-2 rounded-2xl rounded-bl-sm bg-muted/60 px-3.5 py-2.5">
        {message.content === '' && message.status === 'streaming' ? (
          <p className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            正在检索课程资料…
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        )}

        {message.citations.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">引用来源</p>
            {message.citations.map((citation) => (
              <CitationCard key={`${citation.material_id}-${citation.index}`} citation={citation} />
            ))}
          </div>
        ) : null}

        {message.notice === null ? null : (
          <p
            className={cn(
              'flex items-start gap-1.5 text-xs',
              message.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {message.status === 'error' ? (
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            ) : null}
            <span>
              {message.notice}
              {/* 3004 属可自助修复，给一个直达设置的入口（PAD §7.5 / §9.10 v0.8） */}
              {message.errorCode === ERROR_CODES.MODEL_NOT_CONFIGURED ? (
                <>
                  {' '}
                  <Link
                    to="/settings"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    去设置
                  </Link>
                </>
              ) : null}
            </span>
          </p>
        )}

        {message.content === '' ? null : (
          <div className="flex flex-wrap items-center gap-2">
            {message.status === 'streaming' ? (
              <span className="text-muted-foreground text-xs">生成中…</span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => void copyAnswer()}
            >
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? '已复制' : '复制回答'}
            </Button>

            {message.serverMessageId === null ? null : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'text-muted-foreground',
                    message.feedback === 'UP' && 'bg-muted text-primary',
                  )}
                  aria-label="有帮助"
                  aria-pressed={message.feedback === 'UP'}
                  disabled={feedbackMutation.isPending}
                  onClick={() => toggleFeedback('UP')}
                >
                  <ThumbsUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'text-muted-foreground',
                    message.feedback === 'DOWN' && 'bg-muted text-destructive',
                  )}
                  aria-label="没帮助"
                  aria-pressed={message.feedback === 'DOWN'}
                  disabled={feedbackMutation.isPending}
                  onClick={() => toggleFeedback('DOWN')}
                >
                  <ThumbsDown aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
