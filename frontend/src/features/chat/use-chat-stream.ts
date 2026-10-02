import { useCallback, useEffect, useRef, useState } from 'react'

import { useRefreshConversations } from '@/features/chat/queries'
import { ApiError, resolveErrorMessage } from '@/lib/http'
import { abortChat, isAbortError, streamChat } from '@/lib/sse'
import type { FinishReason } from '@/schemas/chat'
import { type Citation, CitationSchema, type FeedbackRating } from '@/schemas/conversation'
import { useAuthStore } from '@/stores/auth-store'
import { useChatStore } from '@/stores/chat-store'

/** 随问题一并发给后端的历史消息条数 */
const HISTORY_LIMIT = 6

/** 静默超时（长时间无任何帧）时的降级说明 */
const IDLE_TIMEOUT_NOTICE = '长时间未收到响应，生成已中断'

export type ChatMessageStatus = 'streaming' | 'done' | 'aborted' | 'error'

/** 面板内渲染用的消息模型；流式期间 `id` 为本地临时 ID，保证 key 稳定不重挂载 */
export interface ChatUiMessage {
  id: string
  /** 后端消息 ID，message_start 到达后才有；点赞/点踩等按 id 操作依赖它 */
  serverMessageId: string | null
  role: 'USER' | 'ASSISTANT'
  content: string
  citations: Citation[]
  /** 点赞/点踩结果，null 表示未反馈 */
  feedback: FeedbackRating | null
  status: ChatMessageStatus
  /** 中断 / 截断 / 异常等补充说明，展示在气泡底部 */
  notice: string | null
  /** 失败时的业务错误码，用于区分「可自助修复」的 3004（去设置）等情况 */
  errorCode: number | null
}

const FINISH_STATUS: Record<FinishReason, ChatMessageStatus> = {
  stop: 'done',
  aborted: 'aborted',
  length: 'done',
  error: 'error',
}

const FINISH_NOTICES: Record<FinishReason, string | null> = {
  stop: null,
  aborted: '回答已中断，已保留已生成的内容',
  length: '回答已达长度上限，内容可能不完整',
  error: '生成过程中出现异常，请重试',
}

let localIdSeed = 0

function nextLocalId(prefix: string): string {
  localIdSeed += 1
  return `${prefix}-${localIdSeed}`
}

export interface UseChatStreamResult {
  messages: ChatUiMessage[]
  isStreaming: boolean
  send: (question: string) => Promise<void>
  /** 用户主动中断：本地断流 + 通知后端释放算力，保留已生成内容 */
  stop: () => void
  /** 反馈成功后回写本地消息态（按本地 id 定位，避免整表重渲染） */
  setFeedback: (messageId: string, rating: FeedbackRating | null) => void
  /** 手动开启新对话：清空消息并丢弃会话上下文 */
  reset: () => void
}

export interface UseChatStreamOptions {
  /** 检索范围：course_id，0 表示全部资料 */
  courseId: number
  /** 外层已知的会话 ID（如 URL 的 :conversationId）；null 表示交给后端新建 */
  conversationId: string | null
  /** 后端新建会话后的回调，便于外层把会话写回 URL 或 store */
  onConversationCreated?: (conversationId: string) => void
}

/**
 * 课程问答的流式状态机：负责发问、逐帧追加、引用收集、中断与降级。
 * 只维护「本次会话内产生的消息」——历史消息由外层自行加载后与之拼接。
 * 关键约束（PAD §6.2）：chunk 只更新目标消息那一行，避免整表重渲染。
 */
export function useChatStream({
  courseId,
  conversationId,
  onConversationCreated,
}: UseChatStreamOptions): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatUiMessage[]>([])

  const controllerRef = useRef<AbortController | null>(null)
  const abortedRef = useRef(false)
  /** 外层未提供会话时，复用本 hook 自己新建的会话，避免每次提问都新开一个会话 */
  const selfCreatedRef = useRef<string | null>(null)

  const refreshConversations = useRefreshConversations()
  const status = useChatStore((state) => state.status)
  const beginStream = useChatStore((state) => state.beginStream)
  const endStream = useChatStore((state) => state.endStream)

  // 卸载时中断在途请求，避免流还在跑而组件已销毁
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  const send = useCallback(
    async (question: string): Promise<void> => {
      const trimmed = question.trim()
      if (trimmed === '' || controllerRef.current !== null) return

      const assistantId = nextLocalId('assistant')
      const patch = (updater: (message: ChatUiMessage) => ChatUiMessage): void => {
        setMessages((prev) =>
          prev.map((message) => (message.id === assistantId ? updater(message) : message)),
        )
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextLocalId('user'),
          serverMessageId: null,
          role: 'USER',
          content: trimmed,
          citations: [],
          feedback: null,
          status: 'done',
          notice: null,
          errorCode: null,
        },
        {
          id: assistantId,
          serverMessageId: null,
          role: 'ASSISTANT',
          content: '',
          citations: [],
          feedback: null,
          status: 'streaming',
          notice: null,
          errorCode: null,
        },
      ])

      abortedRef.current = false
      beginStream()

      const controller = new AbortController()
      controllerRef.current = controller

      try {
        await streamChat({
          body: {
            conversation_id: conversationId ?? selfCreatedRef.current ?? undefined,
            course_id: courseId,
            question: trimmed,
            history_limit: HISTORY_LIMIT,
          },
          accessToken: useAuthStore.getState().accessToken,
          signal: controller.signal,
          callbacks: {
            onStart: (data) => {
              selfCreatedRef.current = data.conversation_id
              onConversationCreated?.(data.conversation_id)
              patch((message) => ({ ...message, serverMessageId: data.message_id }))
            },
            onChunk: (data) => {
              patch((message) => ({ ...message, content: message.content + data.delta }))
            },
            onCitation: (data) => {
              // CitationSchema 会剥掉 SSE 专有的 message_id，只留渲染所需字段
              const citation = CitationSchema.parse(data)
              patch((message) => ({ ...message, citations: [...message.citations, citation] }))
            },
            onEnd: (data) => {
              patch((message) => ({
                ...message,
                status: FINISH_STATUS[data.finish_reason],
                notice: FINISH_NOTICES[data.finish_reason],
              }))
            },
            onError: (data) => {
              patch((message) => ({ ...message, status: 'error', notice: data.message }))
            },
            onIdleTimeout: () => {
              abortedRef.current = true
              patch((message) => ({
                ...message,
                status: 'aborted',
                notice: IDLE_TIMEOUT_NOTICE,
              }))
            },
          },
        })

        // 连接结束却没等到 message_end（含用户中断）：避免气泡永久停在「生成中」
        patch((message) =>
          message.status === 'streaming'
            ? {
                ...message,
                status: abortedRef.current ? 'aborted' : 'error',
                notice: abortedRef.current ? FINISH_NOTICES.aborted : '连接意外结束，请重试',
              }
            : message,
        )
      } catch (error) {
        if (isAbortError(error)) {
          // 已由流中 error 事件定性的消息不再覆盖
          patch((message) =>
            message.status === 'error'
              ? message
              : { ...message, status: 'aborted', notice: FINISH_NOTICES.aborted },
          )
        } else {
          patch((message) => ({
            ...message,
            status: 'error',
            notice: resolveErrorMessage(error),
            errorCode: error instanceof ApiError ? error.code : null,
          }))
        }
      } finally {
        controllerRef.current = null
        endStream(abortedRef.current)
        refreshConversations()
      }
    },
    [beginStream, conversationId, courseId, endStream, onConversationCreated, refreshConversations],
  )

  const stop = useCallback((): void => {
    const controller = controllerRef.current
    if (controller === null) return

    abortedRef.current = true
    const activeId = conversationId ?? selfCreatedRef.current
    controller.abort()

    // 本地断流后通知后端释放模型算力；失败不打扰用户
    if (activeId !== null) {
      void abortChat(activeId).catch(() => undefined)
    }
  }, [conversationId])

  const setFeedback = useCallback((messageId: string, rating: FeedbackRating | null): void => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, feedback: rating } : message,
      ),
    )
  }, [])

  const reset = useCallback((): void => {
    controllerRef.current?.abort()
    controllerRef.current = null
    abortedRef.current = false
    selfCreatedRef.current = null
    setMessages([])
  }, [])

  return { messages, isStreaming: status === 'streaming', send, stop, setFeedback, reset }
}
