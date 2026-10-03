import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useWeakPointsQuery } from '@/features/quiz/queries'
import { resolveErrorMessage } from '@/lib/http'

/** 薄弱知识点排行（PAD §6.2 StatsPage）：复用 GET /quiz/weak-points，掌握度升序 */
export function WeakPointRank() {
  // course_id=0 表示跨课程汇总
  const query = useWeakPointsQuery(0)
  const items = query.data?.items ?? []

  return (
    <section aria-label="薄弱知识点排行" className="space-y-3 rounded-xl border border-border p-4">
      <header className="space-y-0.5">
        <h3 className="font-medium text-sm">薄弱知识点排行</h3>
        <p className="text-muted-foreground text-xs">按掌握度升序，越靠前越需要优先复习</p>
      </header>

      {query.isPending ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">薄弱点加载失败</p>
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
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">还没有薄弱点数据，多做几次练习就会生成。</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const percent = Math.round(item.score * 100)
            return (
              <li key={item.point_name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{item.point_name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    掌握度 {percent}%
                  </span>
                </div>
                <Progress value={percent} aria-label={`${item.point_name} 掌握度`} />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
