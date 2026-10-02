import { z } from 'zod'

import { IsoDateTimeSchema, WireIdSchema } from '@/schemas/common'
import { CitationSchema } from '@/schemas/conversation'

/* --------------------------- 流式问答（SSE 契约） --------------------------- */

/** POST /ai/chat/stream 请求体 —— PAD §9.6 */
export const ChatRequestBodySchema = z.object({
  /** 为空则由后端新建会话，并在 message_start 回传 */
  conversation_id: z.string().min(1).optional(),
  /** 检索范围：课程 ID；0 表示全部资料 */
  course_id: z.number().int().min(0),
  question: z.string().trim().min(1, '请输入问题').max(2000, '问题不超过 2000 字'),
  history_limit: z.number().int().min(0).max(20).default(6),
})
export type ChatRequestBody = z.infer<typeof ChatRequestBodySchema>

export const SSE_EVENT_NAMES = [
  'message_start',
  'message_chunk',
  'citation',
  'message_end',
  'error',
] as const
export const SseEventNameSchema = z.enum(SSE_EVENT_NAMES)
export type SseEventName = z.infer<typeof SseEventNameSchema>

/** event: message_start —— 保证先于首个 token */
export const MessageStartDataSchema = z.object({
  message_id: WireIdSchema,
  conversation_id: WireIdSchema,
  created_at: IsoDateTimeSchema,
})
export type MessageStartData = z.infer<typeof MessageStartDataSchema>

/** event: message_chunk —— 增量文本 */
export const MessageChunkDataSchema = z.object({
  message_id: WireIdSchema,
  delta: z.string(),
})
export type MessageChunkData = z.infer<typeof MessageChunkDataSchema>

/** event: citation —— 引用片段，可在任意 chunk 之间下发 */
export const CitationDataSchema = CitationSchema.extend({ message_id: WireIdSchema })
export type CitationData = z.infer<typeof CitationDataSchema>

/** finish_reason：正常 / 用户中断 / 超长截断 / 异常终止 */
export const FinishReasonSchema = z.enum(['stop', 'aborted', 'length', 'error'])
export type FinishReason = z.infer<typeof FinishReasonSchema>

/** event: message_end */
export const MessageEndDataSchema = z.object({
  message_id: WireIdSchema,
  finish_reason: FinishReasonSchema,
  tokens: z.number().int().min(0),
  elapsed_ms: z.number().int().min(0),
})
export type MessageEndData = z.infer<typeof MessageEndDataSchema>

/** event: error —— code 为字符串枚举，如 AI_SERVICE_UNAVAILABLE */
export const StreamErrorDataSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  message_id: WireIdSchema.optional(),
})
export type StreamErrorData = z.infer<typeof StreamErrorDataSchema>

/** POST /ai/chat/abort 请求体 */
export const AbortChatBodySchema = z.object({
  conversation_id: WireIdSchema,
})
export type AbortChatBody = z.infer<typeof AbortChatBodySchema>

/** GET /ai/suggestions 查询参数 */
export const SuggestionsQuerySchema = z.object({
  course_id: z.number().int().min(0),
})
export type SuggestionsQuery = z.infer<typeof SuggestionsQuerySchema>

export const SuggestionsResponseSchema = z.object({
  items: z.array(z.string().min(1)),
})
export type SuggestionsResponse = z.infer<typeof SuggestionsResponseSchema>
