import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'

import { fetchActivities, fetchStatsOverview, fetchTrend } from '@/features/stats/api'
import { queryKeys } from '@/lib/query-keys'
import type { TrendQuery } from '@/schemas/stats'

/** 总览指标 */
export function useStatsOverviewQuery() {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.stats.overview(),
      queryFn: () => fetchStatsOverview(),
    }),
  )
}

/** 趋势：切换时间范围时保留上一份数据，避免图表闪空 */
export function useTrendQuery(query: TrendQuery) {
  return useQuery(
    queryOptions({
      queryKey: queryKeys.stats.trend(query.type, query.range ?? 'week'),
      queryFn: () => fetchTrend(query),
      placeholderData: keepPreviousData,
    }),
  )
}

export function useActivitiesQuery(limit = 10) {
  return useQuery(
    queryOptions({
      queryKey: [...queryKeys.stats.activities(), limit],
      queryFn: () => fetchActivities(limit),
    }),
  )
}
