import { env } from '@/lib/env'
import { ApiError, clearSessionOnUnauthorized, http, refreshAccessTokenOnce } from '@/lib/http'
import { createRequestId } from '@/lib/utils'
import {
  type ChatRequestBody,
  type CitationData,
  CitationDataSchema,
  type MessageChunkData,
  MessageChunkDataSchema,
  type MessageEndData,
  MessageEndDataSchema,
  type MessageStartData,
  MessageStartDataSchema,
  type StreamErrorData,
  StreamErrorDataSchema,
} from '@/schemas/chat'
import { ApiEnvelopeBaseSchema, ERROR_CODES, ERROR_MESSAGES } from '@/schemas/common'

/**
 * SSE 流式问答客户端 —— PAD §7.9
 * 使用 fetch + ReadableStream（Axios 无法流式读取响应体）
 */

export interface ChatStreamCallbacks {
  onStart?: (data: MessageStartData) => void
  onChunk?: (data: MessageChunkData) => void
  onCitation?: (data: CitationData) => void
  onEnd?: (data: MessageEndData) => void
  onError?: (data: StreamErrorData) => void
  /** 静默超时（长时间未收到任何帧），已生成内容需保留 */
  onIdleTimeout?: () => void
}

export interface StreamChatParams {
  body: ChatRequestBody
  accessToken: string | null
  callbacks: ChatStreamCallbacks
  signal?: AbortSignal
  idleTimeoutMs?: number
}

const FRAME_SEPARATOR = /\r?\n\r?\n/
const CHAT_STREAM_PATH = '/ai/chat/stream'

interface RawFrame {
  event: string
  data: string
}

function parseFrame(raw: string): RawFrame | null {
  let event = ''
  const dataLines: string[] = []

  for (const line of raw.split('\n')) {
    // 空行与以 ':' 开头的注释行（心跳 ': ping'）直接跳过
    if (line === '' || line.startsWith(':')) continue

    const colonIndex = line.indexOf(':')
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
    const rawValue = colonIndex === -1 ? '' : line.slice(colonIndex + 1)
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  if (event === '' && dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function dispatchFrame(raw: string, callbacks: ChatStreamCallbacks): void {
  const frame = parseFrame(raw)
  if (!frame || frame.data === '') return

  const payload = safeJsonParse(frame.data)
  if (payload === null) return

  switch (frame.event) {
    case 'message_start': {
      const result = MessageStartDataSchema.safeParse(payload)
      if (result.success) callbacks.onStart?.(result.data)
      return
    }
    case 'message_chunk': {
      const result = MessageChunkDataSchema.safeParse(payload)
      if (result.success) callbacks.onChunk?.(result.data)
      return
    }
    case 'citation': {
      const result = CitationDataSchema.safeParse(payload)
      if (result.success) callbacks.onCitation?.(result.data)
      return
    }
    case 'message_end': {
      const result = MessageEndDataSchema.safeParse(payload)
      if (result.success) callbacks.onEnd?.(result.data)
      return
    }
    case 'error': {
      const result = StreamErrorDataSchema.safeParse(payload)
      callbacks.onError?.(
        result.success
          ? result.data
          : { code: 'SSE_PROTOCOL_ERROR', message: '流式响应格式异常，请重试' },
      )
      return
    }
    default:
      return
  }
}

/** 从缓冲区中不断切出完整帧并派发，返回尚未闭合的剩余内容 */
function drainFrames(buffer: string, callbacks: ChatStreamCallbacks): string {
  let rest = buffer
  let match = FRAME_SEPARATOR.exec(rest)

  while (match) {
    const rawFrame = rest.slice(0, match.index)
    rest = rest.slice(match.index + (match[0] ?? '').length)
    dispatchFrame(rawFrame, callbacks)
    match = FRAME_SEPARATOR.exec(rest)
  }

  return rest
}

/** 流式接口在连接建立前失败时，后端返回的是普通 JSON 包装，需转成 ApiError */
async function toStreamApiError(response: Response): Promise<ApiError> {
  const status = response.status
  const text = await response.text().catch(() => '')

  if (text !== '') {
    const envelope = ApiEnvelopeBaseSchema.safeParse(safeJsonParse(text))
    if (envelope.success && envelope.data.code !== ERROR_CODES.OK) {
      return new ApiError({
        code: envelope.data.code,
        message: envelope.data.message || (ERROR_MESSAGES[envelope.data.code] ?? '请求失败'),
        status,
        traceId: envelope.data.trace_id ?? undefined,
        payload: envelope.data.data,
      })
    }
    // 后端以 SSE 形式直接下发了 error 事件（未走 envelope）
    const frame = parseFrame(text)
    if (frame?.event === 'error') {
      const result = StreamErrorDataSchema.safeParse(safeJsonParse(frame.data))
      return new ApiError({
        code: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
        message: result.success ? result.data.message : 'AI 服务暂不可用，请稍后重试',
        status,
      })
    }
  }

  if (status === 503) {
    return new ApiError({
      code: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
      message: ERROR_MESSAGES[ERROR_CODES.AI_SERVICE_UNAVAILABLE] ?? 'AI 服务暂不可用',
      status,
    })
  }

  return new ApiError({
    code: ERROR_CODES.INTERNAL,
    message: '连接 AI 服务失败，请稍后重试',
    status,
  })
}

/**
 * 发起流式问答。
 * 用户中断：外部传入的 signal 触发 abort；静默超时：内部 controller 触发 abort 并回调 onIdleTimeout。
 */
export async function streamChat(params: StreamChatParams): Promise<void> {
  const { body, accessToken, callbacks, signal, idleTimeoutMs = env.sseIdleTimeoutMs } = params

  const controller = new AbortController()
  const handleExternalAbort = (): void => controller.abort()
  signal?.addEventListener('abort', handleExternalAbort, { once: true })

  let idleTimer: ReturnType<typeof setTimeout> | undefined

  const clearIdleTimer = (): void => {
    if (idleTimer !== undefined) {
      clearTimeout(idleTimer)
      idleTimer = undefined
    }
  }

  const resetIdleTimer = (): void => {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      callbacks.onIdleTimeout?.()
      controller.abort()
    }, idleTimeoutMs)
  }

  /** 单次发起请求；401 恢复需要换 token 重放，故抽成可复用函数 */
  const requestStream = (token: string | null): Promise<Response> =>
    fetch(`${env.apiBaseUrl}${CHAT_STREAM_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Request-Id': createRequestId(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

  try {
    let response = await requestStream(accessToken)

    /*
     * access_token 过期（2h）时按 PAD §7.1 自动刷新一次并重放。
     * 这里是 fetch 通道，不经 axios 拦截器，必须显式对齐，否则长会话后提问会直接报登录失效。
     * 刷新失败或重放后仍 401 —— 与拦截器一致地清会话，让路由守卫把用户送回登录页。
     */
    if (response.status === 401) {
      const nextToken = await refreshAccessTokenOnce()
      if (nextToken !== null) response = await requestStream(nextToken)
      if (response.status === 401) clearSessionOnUnauthorized()
    }

    if (!response.ok || !response.body) {
      throw await toStreamApiError(response)
    }

    resetIdleTimer()

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      resetIdleTimer()
      buffer += decoder.decode(value, { stream: true })
      buffer = drainFrames(buffer, callbacks)
    }

    // 冲刷解码器与末尾未闭合的帧
    buffer += decoder.decode()
    drainFrames(`${buffer}\n\n`, callbacks)
  } finally {
    clearIdleTimer()
    signal?.removeEventListener('abort', handleExternalAbort)
  }
}

/** 通知后端释放模型算力（前端已在本地 abort 连接后调用） */
export async function abortChat(conversationId: string): Promise<void> {
  await http.post<null>('/ai/chat/abort', { conversation_id: conversationId })
}

/** 判断异常是否为「用户主动中断」 */
export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
