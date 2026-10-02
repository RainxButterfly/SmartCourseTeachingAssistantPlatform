import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/http'
import { ERROR_CODES } from '@/schemas/common'

/**
 * 服务端状态统一入口。
 * 默认策略：30s 内视为新鲜；4xx 业务错误不重试，其余最多重试 2 次。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          const retryableCodes: number[] = [
            ERROR_CODES.AI_SERVICE_UNAVAILABLE,
            ERROR_CODES.MODEL_TIMEOUT,
            ERROR_CODES.INTERNAL,
          ]
          if (!retryableCodes.includes(error.code)) return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: 0,
    },
  },
})
