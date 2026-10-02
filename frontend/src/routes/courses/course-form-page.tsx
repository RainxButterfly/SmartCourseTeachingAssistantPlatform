import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseForm } from '@/features/course/components/course-form'
import { useCourseDetailQuery } from '@/features/course/queries'
import { resolveErrorMessage } from '@/lib/http'
import { COURSE_COLOR_PRESETS, type CourseFormValues } from '@/schemas/course'

const CREATE_DEFAULTS: CourseFormValues = {
  name: '',
  code: '',
  semester: '',
  teacher: '',
  color: COURSE_COLOR_PRESETS[0] ?? '#7c9cff',
  description: '',
  visibility: 'PRIVATE',
}

function FormSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2" aria-hidden="true">
      {['name', 'code', 'semester', 'teacher'].map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

/** 新建（/courses/new）与编辑（/courses/:id/edit）共用同一表单 */
export function CourseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const courseId = id === undefined ? undefined : Number(id)
  const isEdit = courseId !== undefined

  const detailQuery = useCourseDetailQuery(courseId ?? 0)

  const header = (
    <header className="flex items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="返回课程列表"
        onClick={() => navigate('/courses')}
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <div className="space-y-1">
        <h1 className="font-semibold text-xl">{isEdit ? '编辑课程' : '新建课程'}</h1>
        <p className="text-muted-foreground text-sm">
          {isEdit ? '修改课程信息后保存，资料与对话不受影响' : '创建后即可上传资料构建专属知识库'}
        </p>
      </div>
    </header>
  )

  if (isEdit && !Number.isFinite(courseId)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {header}
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

  if (isEdit && detailQuery.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {header}
        <FormSkeleton />
      </div>
    )
  }

  if (isEdit && (detailQuery.isError || !detailQuery.data)) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {header}
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

  const detail = detailQuery.data
  const defaultValues: CourseFormValues =
    isEdit && detail
      ? {
          name: detail.name,
          code: detail.code,
          semester: detail.semester,
          teacher: detail.teacher,
          color: detail.color,
          description: detail.description,
          visibility: detail.visibility,
        }
      : CREATE_DEFAULTS

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {header}
      <div className="rounded-xl border border-border p-5">
        <CourseForm
          // 保证编辑态数据到达后表单重新初始化
          key={isEdit ? `edit-${courseId}` : 'create'}
          courseId={courseId}
          defaultValues={defaultValues}
          onSaved={(course) => navigate(`/courses/${course.id}`)}
          onCancel={() => navigate('/courses')}
        />
      </div>
    </div>
  )
}
