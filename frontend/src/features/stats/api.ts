import { http } from '@/lib/http'
import {
  type ActivityList,
  ActivityListSchema,
  type StatsOverview,
  StatsOverviewSchema,
  type Trend,
  type TrendQuery,
  TrendQuerySchema,
  TrendSchema,
} from '@/schemas/stats'

/** 学习统计接口层（PAD §7.7） */

/** GET /stats/overview */
export async function fetchStatsOverview(): Promise<StatsOverview> {
  const raw = await http.request<unknown>({ method: 'GET', url: '/stats/overview' })
  return StatsOverviewSchema.parse(raw)
}

/** GET /stats/trend —— unit 由后端给出，前端据此格式化 */
export async function fetchTrend(query: TrendQuery): Promise<Trend> {
  const parsed = TrendQuerySchema.parse(query)
  const raw = await http.request<unknown>({
    method: 'GET',
    url: '/stats/trend',
    params: { type: parsed.type, range: parsed.range },
  })
  return TrendSchema.parse(raw)
}

/** GET /stats/activities?limit= */
export async function fetchActivities(limit: number): Promise<ActivityList> {
  const raw = await http.request<unknown>({
    method: 'GET',
    url: '/stats/activities',
    params: { limit },
  })
  return ActivityListSchema.parse(raw)
}
