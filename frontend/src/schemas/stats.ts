import { z } from 'zod'

import { IdSchema, IsoDateTimeSchema } from '@/schemas/common'

/* ------------------- 学习统计（PAD §7.7 / §9.8 v0.11） ------------------- */

/** GET /stats/overview —— ratio 类字段取值 0~1，由前端转百分比 */
export const StatsOverviewSchema = z.object({
  study_minutes_today: z.number().int().min(0),
  material_count: z.number().int().min(0),
  qa_count: z.number().int().min(0),
  qa_accuracy: z.number().min(0).max(1),
  quiz_accuracy: z.number().min(0).max(1),
  weak_point_count: z.number().int().min(0),
})
export type StatsOverview = z.infer<typeof StatsOverviewSchema>

export const TREND_TYPES = [
  'study_time',
  'quiz_accuracy',
  'qa_hit_rate',
  'material_growth',
] as const
export const TrendTypeSchema = z.enum(TREND_TYPES)
export type TrendType = z.infer<typeof TrendTypeSchema>

export const TREND_RANGES = ['week', 'month'] as const
export const TrendRangeSchema = z.enum(TREND_RANGES)
export type TrendRange = z.infer<typeof TrendRangeSchema>

/** unit 由后端决定，前端只按它格式化，不得硬编码 */
export const TREND_UNITS = ['minute', 'ratio', 'count'] as const
export const TrendUnitSchema = z.enum(TREND_UNITS)
export type TrendUnit = z.infer<typeof TrendUnitSchema>

export const TrendPointSchema = z.object({ label: z.string().min(1), value: z.number() })
export type TrendPoint = z.infer<typeof TrendPointSchema>

/** GET /stats/trend */
export const TrendSchema = z.object({
  type: TrendTypeSchema,
  range: TrendRangeSchema,
  unit: TrendUnitSchema,
  series: z.array(TrendPointSchema),
})
export type Trend = z.infer<typeof TrendSchema>

export const TrendQuerySchema = z.object({
  type: TrendTypeSchema,
  range: TrendRangeSchema.default('week'),
})
export type TrendQuery = z.input<typeof TrendQuerySchema>

export const ACTIVITY_TYPES = [
  'COURSE_CREATED',
  'MATERIAL_UPLOADED',
  'MATERIAL_DELETED',
  'QUIZ_SUBMITTED',
  'CHAT_ASKED',
] as const
export const ActivityTypeSchema = z.enum(ACTIVITY_TYPES)
export type ActivityType = z.infer<typeof ActivityTypeSchema>

/** GET /stats/activities —— title 由后端拼好可直接展示的文案 */
export const ActivitySchema = z.object({
  id: IdSchema,
  type: ActivityTypeSchema,
  target_id: z.string(),
  target_type: z.string(),
  title: z.string().min(1),
  created_at: IsoDateTimeSchema,
})
export type Activity = z.infer<typeof ActivitySchema>

export const ActivityListSchema = z.object({ items: z.array(ActivitySchema) })
export type ActivityList = z.infer<typeof ActivityListSchema>

export const ActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

/** 趋势数值格式化：一律按 unit 决定后缀 */
export function formatTrendValue(value: number, unit: TrendUnit): string {
  if (unit === 'ratio') return `${Math.round(value * 100)}%`
  if (unit === 'minute') return `${value} 分钟`
  return String(value)
}

/** 各趋势的标题与说明（PAD §7.7 的图表类型写死） */
export const TREND_META: Record<TrendType, { title: string; hint: string }> = {
  study_time: { title: '学习时长趋势', hint: '每日投入的学习分钟数' },
  quiz_accuracy: { title: '答题正确率', hint: '每日练习的答对比例' },
  qa_hit_rate: { title: '问答命中率', hint: '回答能命中课程资料的比例' },
  material_growth: { title: '资料数增长', hint: '累计已入库的资料数' },
}
