import { StatCard } from '@/components/shared/stat-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useStatsOverviewQuery } from '@/features/stats/queries'
import { resolveErrorMessage } from '@/lib/http'

const LOADING_KEYS = [0, 1, 2, 3, 4, 5]

/** 总览指标（PAD §9.8 StatsOverviewVO）：ratio 类字段转百分比展示 */
export function OverviewCards() {
  const query = useStatsOverviewQuery()
  const overview = query.data

  if (query.isPending) {
    return (
      <section aria-label="总览指标" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {LOADING_KEYS.map((key) => (
          <Skeleton key={key} className="h-[4.5rem] w-full" />
        ))}
      </section>
    )
  }

  if (query.isError || overview === undefined) {
    return (
      <section aria-label="总览指标">
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">总览加载失败</p>
          <p className="mt-1 text-muted-foreground text-sm">{resolveErrorMessage(query.error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            重试
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="总览指标" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <StatCard label="今日学习" value={`${overview.study_minutes_today} 分钟`} />
      <StatCard label="资料总数" value={String(overview.material_count)} />
      <StatCard label="问答次数" value={String(overview.qa_count)} />
      <StatCard
        label="问答命中率"
        value={`${Math.round(overview.qa_accuracy * 100)}%`}
        hint="回答能命中课程资料的比例"
      />
      <StatCard
        label="答题正确率"
        value={`${Math.round(overview.quiz_accuracy * 100)}%`}
        hint="所有练习的平均正确率"
      />
      <StatCard label="薄弱知识点" value={String(overview.weak_point_count)} />
    </section>
  )
}
