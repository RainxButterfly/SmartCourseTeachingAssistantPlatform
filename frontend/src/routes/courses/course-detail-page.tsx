import { ArrowLeft, BarChart3, MessageSquareText, Paperclip, Pencil } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { EmptyState } from '@/components/shared/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatPanel } from '@/features/chat/components/chat-panel'
import { useCourseDetailQuery } from '@/features/course/queries'
import { MaterialPanel } from '@/features/material/components/material-panel'
import { resolveErrorMessage } from '@/lib/http'

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
        <Skeleton className="h-14 w-28" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

const TAB_VALUES = ['materials', 'chat', 'stats'] as const
type CourseTab = (typeof TAB_VALUES)[number]

function toCourseTab(value: string | null): CourseTab {
  return value !== null && (TAB_VALUES as readonly string[]).includes(value)
    ? (value as CourseTab)
    : 'materials'
}

/**
 * 课程详情：资料 / 问答 / 统计 三个 Tab（PAD §6.2）。
 * Tab 状态同步 URL（`?tab=`，默认 materials 不写入），使「继续学习」等入口可直达指定 Tab。
 */
export function CourseDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const courseId = Number(id)

  const tab = toCourseTab(searchParams.get('tab'))
  const setTab = (next: CourseTab): void => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (next === 'materials') params.delete('tab')
        else params.set('tab', next)
        return params
      },
      { replace: true },
    )
  }

  const detailQuery = useCourseDetailQuery(courseId)
  const detail = detailQuery.data

  const backButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="返回课程列表"
      onClick={() => navigate('/courses')}
    >
      <ArrowLeft aria-hidden="true" />
    </Button>
  )

  if (!Number.isFinite(courseId)) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="font-semibold text-xl">课程详情</h1>
        </div>
        <EmptyState
          title="课程不存在"
          description="URL 中的课程 ID 无效。"
          action={
            <Button type="button" size="sm" onClick={() => navigate('/courses')}>
              返回课程列表
            </Button>
          }
        />
      </div>
    )
  }

  if (detailQuery.isError || (detailQuery.isSuccess && detail === undefined)) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="font-semibold text-xl">课程详情</h1>
        </div>
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">课程加载失败</p>
          <p className="mt-1 text-muted-foreground text-sm">
            {resolveErrorMessage(detailQuery.error)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void detailQuery.refetch()}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (detailQuery.isPending || detail === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="flex items-center gap-3">
          {backButton}
          <h1 className="font-semibold text-xl">课程详情</h1>
        </div>
        <DetailSkeleton />
      </div>
    )
  }

  const metrics: Array<{ label: string; value: string }> = [
    { label: '资料', value: `${detail.stats.material_count} 份` },
    { label: '已就绪', value: `${detail.stats.ready_material_count} 份` },
    { label: '会话', value: `${detail.stats.conversation_count} 个` },
    { label: '问答', value: `${detail.stats.question_count} 次` },
    { label: '答题正确率', value: `${Math.round(detail.stats.quiz_accuracy * 100)}%` },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex items-start gap-3">
        {backButton}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
              style={{ backgroundColor: detail.color }}
            />
            <h1 className="font-semibold text-xl">{detail.name}</h1>
            <Badge variant="outline" className="font-mono">
              {detail.code}
            </Badge>
            {detail.visibility === 'PUBLIC' ? <Badge variant="ghost">公开</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {detail.teacher === '' ? '未指定教师' : detail.teacher}
            {' · '}
            {detail.semester === '' ? '未指定学期' : detail.semester}
          </p>
          {detail.description === '' ? null : (
            <p className="text-muted-foreground text-sm">{detail.description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/courses/${detail.id}/edit`)}
        >
          <Pencil aria-hidden="true" />
          编辑课程
        </Button>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border px-3 py-2">
            <dt className="text-muted-foreground text-xs">{metric.label}</dt>
            <dd className="font-medium tabular-nums">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <Tabs value={tab} onValueChange={(value) => setTab(toCourseTab(String(value)))}>
        <TabsList>
          <TabsTrigger value="materials">
            <Paperclip aria-hidden="true" />
            资料
          </TabsTrigger>
          <TabsTrigger value="chat">
            <MessageSquareText aria-hidden="true" />
            问答
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 aria-hidden="true" />
            统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="materials">
          <MaterialPanel courseId={detail.id} />
        </TabsContent>

        <TabsContent value="chat">
          <ChatPanel courseId={detail.id} />
        </TabsContent>

        <TabsContent value="stats">
          <EmptyState
            icon={<BarChart3 className="size-5" />}
            title="课程统计"
            description="该 Tab 将展示本课程的问答热度、资料完整度与答题趋势（shadcn charts）。将在统计模块切片中接入。"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
