import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrendQuery } from '@/features/stats/queries'
import { resolveErrorMessage } from '@/lib/http'
import { formatTrendValue, TREND_META, type TrendRange, type TrendType } from '@/schemas/stats'

/** recharts 的 ResponsiveContainer 依赖父容器高度，必须给定固定高度 */
const CHART_HEIGHT = '12rem'

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' } as const

type TrendVariant = 'bar' | 'line' | 'area'

const VARIANT_COLOR: Record<TrendVariant, string> = {
  bar: 'var(--chart-1)',
  line: 'var(--chart-2)',
  area: 'var(--chart-3)',
}

interface TrendChartProps {
  type: TrendType
  range: TrendRange
  variant: TrendVariant
}

/** 趋势图（PAD §7.7）：柱状 / 折线 / 面积三种形态共用同一个契约 */
export function TrendChart({ type, range, variant }: TrendChartProps) {
  const query = useTrendQuery({ type, range })
  const meta = TREND_META[type]
  const trend = query.data
  const latest = trend?.series.at(-1)

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
          该范围内暂无数据
        </p>
      ) : (
        <>
          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              {variant === 'bar' ? (
                <BarChart data={trend.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis width={40} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => formatTrendValue(Number(value), trend.unit)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill={VARIANT_COLOR.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : variant === 'line' ? (
                <LineChart data={trend.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    width={40}
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    formatter={(value) => formatTrendValue(Number(value), trend.unit)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={VARIANT_COLOR.line}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <AreaChart data={trend.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis width={40} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => formatTrendValue(Number(value), trend.unit)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={VARIANT_COLOR.area}
                    fill={VARIANT_COLOR.area}
                    fillOpacity={0.15}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {latest === undefined ? null : (
            <p className="text-muted-foreground text-xs">
              最新（{latest.label}）：{formatTrendValue(latest.value, trend.unit)}
            </p>
          )}
        </>
      )}
    </section>
  )
}
