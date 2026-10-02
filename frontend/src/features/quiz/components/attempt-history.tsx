import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuizAttemptsQuery } from '@/features/quiz/queries'
import { resolveErrorMessage } from '@/lib/http'
import { formatDuration, formatRelativeTime } from '@/lib/utils'

const HISTORY_QUERY = { page: 1, size: 5 } as const

/** 练习记录（PAD §6.2 QuizPage 组卷态下方）：最近 5 次作答，点击进入结果页 */
export function AttemptHistory() {
  const query = useQuizAttemptsQuery({ ...HISTORY_QUERY })
  const list = query.data?.list ?? []

  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h2 className="font-medium">练习记录</h2>

      {query.isPending ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">练习记录加载失败</p>
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
      ) : list.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          还没有练习记录，完成一次练习后会出现在这里。
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((item) => (
            <li key={item.id}>
              <Link
                to={`/quiz/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm">
                  {item.course_name} · {item.total} 题
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {item.score} 分 · 用时 {formatDuration(item.duration_ms)} ·{' '}
                  {formatRelativeTime(item.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
