import { z } from 'zod'

import {
  IdSchema,
  IsoDateTimeSchema,
  NullableIsoDateTimeSchema,
  PageQuerySchema,
  PageResultSchema,
  WireIdSchema,
} from '@/schemas/common'

/* ------------------------------- RAG 对话 ------------------------------- */

export const ConversationSchema = z.object({
  /** 数字字符串，如 "123" */
  id: WireIdSchema,
  title: z.string().min(1).max(100),
  /** 检索范围课程 ID；0 表示全部资料 */
  course_id: z.number().int().min(0),
  course_name: z.string(),
  message_count: z.number().int().min(0),
  last_message_at: NullableIsoDateTimeSchema,
  created_at: IsoDateTimeSchema,
})
export type Conversation = z.infer<typeof ConversationSchema>

export const CONVERSATION_DEFAULT_TITLE = '新对话'

/** POST /conversations 请求体 */
export const CreateConversationBodySchema = z.object({
  course_id: z.number().int().min(0).default(0),
  title: z.string().trim().min(1).max(100).optional(),
})
export type CreateConversationBody = z.infer<typeof CreateConversationBodySchema>

/** PUT /conversations/{id} 请求体（仅重命名） */
export const RenameConversationBodySchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题不超过 100 字'),
})
export type RenameConversationBody = z.infer<typeof RenameConversationBodySchema>

/** GET /conversations 查询参数 */
export const ConversationListQuerySchema = PageQuerySchema.extend({
  course_id: z.coerce.number().int().min(0).optional(),
  keyword: z.string().max(100).optional(),
})
export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>

export const ConversationListResponseSchema = PageResultSchema(ConversationSchema)
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>

/* ---------------------------- 消息与引用（渲染契约） ---------------------------- */

export const MessageRoleSchema = z.enum(['USER', 'ASSISTANT', 'SYSTEM'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const FeedbackRatingSchema = z.enum(['UP', 'DOWN'])
export type FeedbackRating = z.infer<typeof FeedbackRatingSchema>

/** 引用卡片：对应 SSE citation 事件，同时是 t_message.citations(JSON) 的元素结构 */
export const CitationSchema = z.object({
  index: z.number().int().min(1),
  material_id: IdSchema,
  title: z.string().min(1),
  page: z.number().int().min(0),
  snippet: z.string(),
  score: z.number().min(0).max(1).optional(),
})
export type Citation = z.infer<typeof CitationSchema>

export const MessageSchema = z.object({
  id: WireIdSchema,
  conversation_id: WireIdSchema,
  role: MessageRoleSchema,
  content: z.string(),
  tokens: z.number().int().min(0),
  citations: z.array(CitationSchema),
  feedback: FeedbackRatingSchema.nullable(),
  created_at: IsoDateTimeSchema,
})
export type Message = z.infer<typeof MessageSchema>

export const MessageListResponseSchema = PageResultSchema(MessageSchema)
export type MessageListResponse = z.infer<typeof MessageListResponseSchema>

/** PUT /messages/{id}/feedback 请求体（PAD §9.5 v0.6）：幂等替换，rating=null 表示取消 */
export const FeedbackBodySchema = z.object({
  rating: FeedbackRatingSchema.nullable(),
  comment: z.string().max(500, '补充说明不超过 500 字').optional(),
})
export type FeedbackBody = z.infer<typeof FeedbackBodySchema>

/** PUT /messages/{id}/feedback 响应体：回传最新状态，前端据此校正按钮态 */
export const FeedbackResponseSchema = z.object({
  message_id: WireIdSchema,
  feedback: FeedbackRatingSchema.nullable(),
})
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>
