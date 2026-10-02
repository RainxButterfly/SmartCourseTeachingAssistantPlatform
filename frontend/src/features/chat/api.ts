import { http } from '@/lib/http'
import { type SuggestionsResponse, SuggestionsResponseSchema } from '@/schemas/chat'
import {
  type FeedbackBody,
  FeedbackBodySchema,
  type FeedbackResponse,
  FeedbackResponseSchema,
} from '@/schemas/conversation'

/**
 * 问答接口层。
 * 流式问答不走 axios（无法流式读取响应体），由 `@/lib/sse` 的 streamChat 负责。
 */

/** GET /ai/suggestions —— 按检索范围取推荐问题 */
export async function fetchSuggestions(courseId: number): Promise<SuggestionsResponse> {
  const raw = await http.request<unknown>({
    method: 'GET',
    url: '/ai/suggestions',
    params: { course_id: courseId },
  })
  return SuggestionsResponseSchema.parse(raw)
}

/** PUT /messages/{id}/feedback —— 幂等替换点赞/点踩；rating=null 取消（PAD §7.4 v0.6） */
export async function submitFeedback(
  messageId: string,
  body: FeedbackBody,
): Promise<FeedbackResponse> {
  const raw = await http.request<unknown>({
    method: 'PUT',
    url: `/messages/${messageId}/feedback`,
    data: FeedbackBodySchema.parse(body),
  })
  return FeedbackResponseSchema.parse(raw)
}
