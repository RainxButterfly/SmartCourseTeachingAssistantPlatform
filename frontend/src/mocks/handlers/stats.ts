import type { HttpResponseResolver } from 'msw'
import { http } from 'msw'

import { env } from '@/lib/env'
import { listActivities } from '@/mocks/activity'
import { buildTrendFixture, statsOverviewFixture } from '@/mocks/fixtures/stats'
import { fail, ok } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import { ActivityQuerySchema, TrendQuerySchema } from '@/schemas/stats'

const API = env.apiBaseUrl

/** GET /stats/overview */
const getOverview: HttpResponseResolver = () => ok(statsOverviewFixture)

/** GET /stats/trend?type=&range= */
const getTrend: HttpResponseResolver = ({ request }) => {
  const params = new URL(request.url).searchParams
  const parsed = TrendQuerySchema.safeParse({
    type: params.get('type') ?? undefined,
    ...(params.get('range') === null ? {} : { range: params.get('range') }),
  })
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, '趋势类型或时间范围不合法')
  }

  return ok(buildTrendFixture(parsed.data.type, parsed.data.range))
}

/** GET /stats/activities?limit= —— 倒序取最近 N 条 */
const getActivities: HttpResponseResolver = ({ request }) => {
  const limitRaw = new URL(request.url).searchParams.get('limit')
  const parsed = ActivityQuerySchema.safeParse({
    ...(limitRaw === null ? {} : { limit: limitRaw }),
  })
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, 'limit 需为 1~50 的整数')
  }

  return ok({ items: listActivities(parsed.data.limit) })
}

export const statsHandlers = [
  http.get(`${API}/stats/overview`, getOverview),
  http.get(`${API}/stats/trend`, getTrend),
  http.get(`${API}/stats/activities`, getActivities),
]
