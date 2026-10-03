import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ActivityFeed } from '@/features/stats/components/activity-feed'
import { OverviewCards } from '@/features/stats/components/overview-cards'
import { QaHitRatePanel } from '@/features/stats/components/qa-hit-rate-panel'
import { TrendChart } from '@/features/stats/components/trend-chart'
import { WeakPointRank } from '@/features/stats/components/weak-point-rank'
import type { TrendRange } from '@/schemas/stats'

/**
 * 学习统计（PAD §6.1 /stats、§6.2 StatsPage）：
 * 概览卡片 + 四张趋势图 + 薄弱点排行 + 最近活动流。
 * 时间范围只影响「随范围变化」的三张图，问答命中率为饼图且不随范围变化（PAD §7.7）。
 */
export function StatsPage() {
  const [range, setRange] = useState<TrendRange>('week')

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">学习统计</h1>
          <p className="text-muted-foreground text-sm">
            学习投入、答题与问答表现，以及需要优先复习的知识点。
          </p>
        </div>

        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">时间范围</legend>
          <Button
            type="button"
            size="sm"
            variant={range === 'week' ? 'default' : 'outline'}
            aria-pressed={range === 'week'}
            onClick={() => setRange('week')}
          >
            近 7 天
          </Button>
          <Button
            type="button"
            size="sm"
            variant={range === 'month' ? 'default' : 'outline'}
            aria-pressed={range === 'month'}
            onClick={() => setRange('month')}
          >
            近 30 天
          </Button>
        </fieldset>
      </header>

      <OverviewCards />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart type="study_time" range={range} variant="bar" />
        <TrendChart type="quiz_accuracy" range={range} variant="line" />
        <TrendChart type="material_growth" range={range} variant="area" />
        <QaHitRatePanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WeakPointRank />
        <ActivityFeed />
      </div>
    </div>
  )
}
