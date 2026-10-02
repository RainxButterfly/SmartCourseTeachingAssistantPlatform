import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  deleteConversation,
  fetchConversationDetail,
  fetchConversationList,
  fetchMessageList,
  renameConversation,
} from '@/features/conversation/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { ConversationListQuery } from '@/schemas/conversation'

/** 会话消息一次取最近 50 条；PAD 的完整下拉分页留待后续切片 */
export const MESSAGE_PAGE_SIZE = 50

/** 会话列表：翻页保留上一页数据，避免侧栏闪白 */
export function useConversationListQuery(query: ConversationListQuery) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.conversations.list(query),
      queryFn: () => fetchConversationList(query),
      placeholderData: keepPreviousData,
    }),
  )
}

/** 会话详情：拿到会话既定的检索范围（course_id）与标题 */
export function useConversationDetailQuery(id: string | null) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.conversations.detail(id ?? ''),
      queryFn: () => fetchConversationDetail(id ?? ''),
      enabled: id !== null,
    }),
  )
}

/**
 * 消息历史：只在挂载 / 会话切换时拉取。
 * 关闭窗口聚焦回刷，否则刚流式产出的消息会与历史重复（后端已落库）。
 */
export function useMessageListQuery(conversationId: string | null) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.conversations.messages(conversationId ?? '', 1),
      queryFn: () => fetchMessageList(conversationId ?? '', 1, MESSAGE_PAGE_SIZE),
      enabled: conversationId !== null,
      refetchOnWindowFocus: false,
    }),
  )
}

export function useRenameConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameConversation(id, title),
    onSuccess: async (conversation) => {
      queryClient.setQueryData(queryKeys.conversations.detail(conversation.id), conversation)
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() })
      toast.success('会话已重命名')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.conversations.detail(id) })
      queryClient.removeQueries({ queryKey: queryKeys.conversations.messages(id, 1) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() })
      toast.success('会话已删除')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}
