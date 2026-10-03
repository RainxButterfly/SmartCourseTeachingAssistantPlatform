import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrendQuery } from '@/features/stats/queries'
import { resolveErrorMessage } from '@/lib/http'
import { formatTrendValue, TREND_META } from '@/schemas/stats'

/** 命中 / 未命中的切片配色：命中用主色系，未命中用暖色提示差距 */
const SLICE_COLORS = ['var(--chart-1)', 'var(--chart-5)']

const CHART_HEIGHT = '12rem'

/** 问答命中率（PAD §7.7）：固定为饼图，且不随时间范围变化 */
export function QaHitRatePanel() {
  const query = useTrendQuery({ type: 'qa_hit_rate', range: 'week' })
  const meta = TREND_META.qa_hit_rate
  const trend = query.data

  return (
    <section aria-label={meta.title} className="space-y-3 rounded-xl border border-border p-4">
      <header className="space-y-0.5">
        <h3 className="font-medium text-sm">{meta.title}</h3>
        <p className="text-muted-foreground text-xs">{meta.hint}</p>
      </header>

      {query.isPending ? (
        <Skeleton className="w-full" style={{ height: CHART_HEIGHT }} />
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">数据加载失败</p>
          <p className="mt-1 text-muted-foreground text-xs">{resolveErrorMessage(query.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            重试
          </Button>
        </div>
      ) : trend === undefined || trend.series.length === 0 ? (
        <p
          className="flex items-center text-muted-foreground text-sm"
          style={{ height: CHART_HEIGHT }}
        >
          暂无问答数据
        </p>
      ) : (
        <>
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trend.series}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="80%"
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {trend.series.map((point, index) => (
                    <Cell
                      key={point.label}
                      fill={SLICE_COLORS[index % SLICE_COLORS.length] ?? 'var(--chart-1)'}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatTrendValue(Number(value), trend.unit)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 自绘图例：数值同样走 unit 格式化，且可被测试与读屏识别 */}
          <ul className="space-y-1">
            {trend.series.map((point, index) => (
              <li key={point.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
                  />
                  {point.label}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatTrendValue(point.value, trend.unit)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
