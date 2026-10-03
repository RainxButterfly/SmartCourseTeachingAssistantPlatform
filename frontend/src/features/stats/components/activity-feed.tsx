import { BookOpen, MessageSquareText, NotebookPen, Paperclip, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivitiesQuery } from '@/features/stats/queries'
import { resolveErrorMessage } from '@/lib/http'
import { formatRelativeTime } from '@/lib/utils'
import type { ActivityType } from '@/schemas/stats'

const ACTIVITY_ICONS: Record<ActivityType, typeof BookOpen> = {
  COURSE_CREATED: BookOpen,
  MATERIAL_UPLOADED: Paperclip,
  MATERIAL_DELETED: Trash2,
  QUIZ_SUBMITTED: NotebookPen,
  CHAT_ASKED: MessageSquareText,
}

/** 最近活动流（PAD §6.2 StatsPage / DashboardPage）：文案由后端拼好，前端不解析 payload */
export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const query = useActivitiesQuery(limit)
  const items = query.data?.items ?? []

  return (
    <section aria-label="最近活动" className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium text-sm">最近活动</h3>

      {query.isPending ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">活动流加载失败</p>
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
        <p className="text-muted-foreground text-sm">还没有活动记录。</p>
      ) : (
        <ul>
          {items.map((item) => {
            const Icon = ACTIVITY_ICONS[item.type]
            return (
              <li
                key={item.id}
                className="flex items-start gap-2.5 border-b border-border py-2 last:border-0"
              >
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-pretty text-sm">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatRelativeTime(item.created_at)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
