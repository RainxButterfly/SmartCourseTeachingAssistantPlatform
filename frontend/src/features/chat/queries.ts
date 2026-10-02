import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { fetchSuggestions, submitFeedback } from '@/features/chat/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { FeedbackRating } from '@/schemas/conversation'

/** 推荐问题：变更频率低，缓存 5 分钟 */
export function useChatSuggestionsQuery(courseId: number) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.chat.suggestions(courseId),
      queryFn: () => fetchSuggestions(courseId),
      enabled: Number.isFinite(courseId) && courseId >= 0,
      staleTime: 5 * 60_000,
    }),
  )
}

/** 流式结束后回刷会话列表（PAD §6.4），保证 /chat 页的会话排序与标题同步 */
export function useRefreshConversations(): () => void {
  const queryClient = useQueryClient()
  return () => {
    // 只失效「列表」，避免把正在浏览的消息历史一并回刷造成与流式消息重复
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() })
  }
}

interface FeedbackVariables {
  messageId: string
  /** null 表示取消已有反馈 */
  rating: FeedbackRating | null
}

/** 点赞/点踩：幂等替换，失败时回滚由调用方负责（消息态在本地 state / query 缓存里） */
export function useFeedbackMutation() {
  return useMutation({
    mutationFn: ({ messageId, rating }: FeedbackVariables) => submitFeedback(messageId, { rating }),
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}
