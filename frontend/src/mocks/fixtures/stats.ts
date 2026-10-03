import { weakPointFixtures } from '@/mocks/fixtures/quiz'
import type {
  Activity,
  StatsOverview,
  Trend,
  TrendPoint,
  TrendRange,
  TrendType,
} from '@/schemas/stats'

/** 总览：weak_point_count 与薄弱点夹具保持一致，避免两页数字打架 */
export const statsOverviewFixture: StatsOverview = {
  study_minutes_today: 45,
  material_count: 12,
  qa_count: 128,
  qa_accuracy: 0.82,
  quiz_accuracy: 0.76,
  weak_point_count: weakPointFixtures.length,
}

/**
 * 以固定锚点日生成 MM-DD 刻度，避免依赖运行时钟导致快照抖动。
 * 锚点：2026-10-03
 */
function buildDayLabels(count: number): string[] {
  const anchor = new Date('2026-10-03T00:00:00Z')
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor)
    date.setUTCDate(anchor.getUTCDate() - (count - 1 - index))
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${month}-${day}`
  })
}

/** 一周的数据形态；拉长到 30 天时按周循环，正好还原「工作日高、周末低」的节奏 */
function buildSeries(range: TrendRange, weekly: number[]): TrendPoint[] {
  const count = range === 'week' ? 7 : 30
  return buildDayLabels(count).map((label, index) => ({
    label,
    value: weekly[index % weekly.length] ?? 0,
  }))
}

const STUDY_TIME_WEEKLY = [30, 75, 45, 90, 60, 20, 45]
const QUIZ_ACCURACY_WEEKLY = [0.6, 0.75, 0.7, 0.86, 0.8, 0.55, 0.92]
const MATERIAL_GROWTH_WEEKLY = [6, 7, 8, 9, 10, 11, 12]

/** 命中 / 未命中占比：该 type 忽略 range（PAD §7.7） */
const QA_HIT_RATE_SERIES: TrendPoint[] = [
  { label: '命中资料', value: 0.82 },
  { label: '未命中资料', value: 0.18 },
]

export function buildTrendFixture(type: TrendType, range: TrendRange): Trend {
  switch (type) {
    case 'study_time':
      return { type, range, unit: 'minute', series: buildSeries(range, STUDY_TIME_WEEKLY) }
    case 'quiz_accuracy':
      return { type, range, unit: 'ratio', series: buildSeries(range, QUIZ_ACCURACY_WEEKLY) }
    case 'material_growth':
      return { type, range, unit: 'count', series: buildSeries(range, MATERIAL_GROWTH_WEEKLY) }
    case 'qa_hit_rate':
      return { type, range, unit: 'ratio', series: QA_HIT_RATE_SERIES }
  }
}

/** 最近活动流（倒序） */
export const activityFixtures: Activity[] = [
  {
    id: 1,
    type: 'QUIZ_SUBMITTED',
    target_id: '1001',
    target_type: 'QUIZ_ATTEMPT',
    title: '完成「操作系统」练习，答对 8 / 10 题（80 分）',
    created_at: '2026-10-03T21:40:00',
  },
  {
    id: 2,
    type: 'CHAT_ASKED',
    target_id: '1',
    target_type: 'CONVERSATION',
    title: '在「内存管理相关问题」中提问：分页与分段的区别是什么？',
    created_at: '2026-10-03T20:12:00',
  },
  {
    id: 3,
    type: 'MATERIAL_UPLOADED',
    target_id: '112',
    target_type: 'MATERIAL',
    title: '上传资料《第5章 文件系统.pdf》并完成解析',
    created_at: '2026-10-03T16:05:00',
  },
  {
    id: 4,
    type: 'QUIZ_SUBMITTED',
    target_id: '1002',
    target_type: 'QUIZ_ATTEMPT',
    title: '完成「数据结构」练习，答对 5 / 10 题（50 分）',
    created_at: '2026-10-02T22:30:00',
  },
  {
    id: 5,
    type: 'MATERIAL_DELETED',
    target_id: '104',
    target_type: 'MATERIAL',
    title: '删除资料《扫描件-临时.pdf》',
    created_at: '2026-10-02T18:44:00',
  },
  {
    id: 6,
    type: 'COURSE_CREATED',
    target_id: '3',
    target_type: 'COURSE',
    title: '创建课程「计算机网络」',
    created_at: '2026-10-01T10:20:00',
  },
]
