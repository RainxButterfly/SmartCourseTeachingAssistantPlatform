import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { fetchModelConfig, saveModelConfig, testModelConnection } from '@/features/settings/api'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import type { ModelConfigRequest, ModelTestRequest } from '@/schemas/settings'

/** 大模型配置：单例资源，缓存即可，不做轮询 */
export function useModelConfigQuery() {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.settings.model(),
      queryFn: () => fetchModelConfig(),
    }),
  )
}

/** 保存后用响应直接回写缓存，省掉一次 GET */
export function useSaveModelConfigMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ModelConfigRequest) => saveModelConfig(body),
    onSuccess: (config) => {
      queryClient.setQueryData(queryKeys.settings.model(), config)
      toast.success('大模型配置已保存')
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}

/** 测试连接：结果由调用方行内展示，不写缓存 */
export function useTestModelConnectionMutation() {
  return useMutation({
    mutationFn: (body: ModelTestRequest) => testModelConnection(body),
    onError: (error) => {
      toast.error(resolveErrorMessage(error))
    },
  })
}
