import { http } from '@/lib/http'
import {
  type Conversation,
  type ConversationListQuery,
  type ConversationListResponse,
  ConversationListResponseSchema,
  ConversationSchema,
  type CreateConversationBody,
  CreateConversationBodySchema,
  type MessageListResponse,
  MessageListResponseSchema,
  RenameConversationBodySchema,
} from '@/schemas/conversation'

/** 会话与消息接口层（PAD §7.4） */

/** GET /conversations —— 会话列表（关键词搜索 + 最近排序 + 分页） */
export async function fetchConversationList(
  query: ConversationListQuery,
): Promise<ConversationListResponse> {
  const params: Record<string, string | number> = { page: query.page, size: query.size }
  if (query.keyword !== undefined && query.keyword !== '') params.keyword = query.keyword
  if (query.course_id !== undefined && query.course_id > 0) params.course_id = query.course_id

  const raw = await http.request<unknown>({ method: 'GET', url: '/conversations', params })
  return ConversationListResponseSchema.parse(raw)
}

/** GET /conversations/{id} —— 会话详情（用于取会话既定的检索范围与标题） */
export async function fetchConversationDetail(id: string): Promise<Conversation> {
  const raw = await http.request<unknown>({ method: 'GET', url: `/conversations/${id}` })
  return ConversationSchema.parse(raw)
}

/** POST /conversations —— 新建；title 为空时后端给默认值 */
export async function createConversation(body: CreateConversationBody): Promise<Conversation> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/conversations',
    data: CreateConversationBodySchema.parse(body),
  })
  return ConversationSchema.parse(raw)
}

/** PUT /conversations/{id} —— 仅重命名 */
export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const raw = await http.request<unknown>({
    method: 'PUT',
    url: `/conversations/${id}`,
    data: RenameConversationBodySchema.parse({ title }),
  })
  return ConversationSchema.parse(raw)
}

/** DELETE /conversations/{id} */
export async function deleteConversation(id: string): Promise<void> {
  await http.request({ method: 'DELETE', url: `/conversations/${id}` })
}

/** GET /conversations/{id}/messages —— 消息分页 */
export async function fetchMessageList(
  id: string,
  page: number,
  size: number,
): Promise<MessageListResponse> {
  const raw = await http.request<unknown>({
    method: 'GET',
    url: `/conversations/${id}/messages`,
    params: { page, size },
  })
  return MessageListResponseSchema.parse(raw)
}
