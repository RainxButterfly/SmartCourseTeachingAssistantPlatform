import { Link } from 'react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourseListQuery } from '@/features/course/queries'
import { resolveErrorMessage } from '@/lib/http'
import { cn, formatRelativeTime } from '@/lib/utils'

const RECENT_COURSE_QUERY = { page: 1, size: 6, sort: 'recent' } as const

const LOADING_KEYS = [0, 1, 2]

/** 最近课程（PAD §6.2 DashboardPage）：横滑卡片，「继续学习」直达课程问答 Tab */
export function RecentCourses() {
  const query = useCourseListQuery({ ...RECENT_COURSE_QUERY })
  const courses = query.data?.list ?? []

  return (
    <section aria-label="最近课程" className="space-y-3 rounded-xl border border-border p-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-sm">最近课程</h3>
        <Link to="/courses" className={buttonVariants({ variant: 'ghost', size: 'xs' })}>
          全部课程
        </Link>
      </header>

      {query.isPending ? (
        <div className="flex gap-3" aria-hidden="true">
          {LOADING_KEYS.map((key) => (
            <Skeleton key={key} className="h-28 w-56 shrink-0" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">课程加载失败</p>
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
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          还没有课程，
          <Link to="/courses/new" className="text-primary underline-offset-4 hover:underline">
            先创建一门
          </Link>
          。
        </p>
      ) : (
        <ul className="flex snap-x gap-3 overflow-x-auto pb-1">
          {courses.map((course) => (
            <li key={course.id} className="w-56 shrink-0 snap-start">
              <div className="flex h-full flex-col gap-1.5 rounded-xl border border-border p-3">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-10 rounded-full"
                  style={{ backgroundColor: course.color }}
                />
                <p className="truncate text-sm" title={course.name}>
                  {course.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {course.code} · {course.material_count} 份资料
                </p>
                <p className="text-muted-foreground text-xs">
                  最近活跃 {formatRelativeTime(course.last_active_at)}
                </p>
                <Link
                  to={`/courses/${course.id}?tab=chat`}
                  aria-label={`继续学习 ${course.name}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1.5')}
                >
                  继续学习
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
