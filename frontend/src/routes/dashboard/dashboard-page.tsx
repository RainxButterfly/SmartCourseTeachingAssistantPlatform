import { QuickActions } from '@/features/dashboard/components/quick-actions'
import { RecentCourses } from '@/features/dashboard/components/recent-courses'
import { ActivityFeed } from '@/features/stats/components/activity-feed'
import { OverviewCards } from '@/features/stats/components/overview-cards'
import { useAuthStore } from '@/stores/auth-store'

/** 按时段取问候语 */
function resolveGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

/**
 * 学习概览（PAD §6.1 `/`、§6.2 DashboardPage）：
 * 问候语 + 快捷入口 + 概览指标卡 + 最近课程横滑 + 最近活动流。
 * 指标卡与活动流直接复用统计页的组件，两页共用同一份接口缓存。
 */
export function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const greeting = resolveGreeting(new Date())

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-semibold text-xl">
            {greeting}，{user?.username ?? '同学'}
          </h1>
          <p className="text-muted-foreground text-sm">
            把课程资料变成可检索的知识库，随时提问、随时练习。
          </p>
        </div>
        <QuickActions />
      </header>

      <OverviewCards />
      <RecentCourses />
      <ActivityFeed limit={6} />
    </div>
  )
}
