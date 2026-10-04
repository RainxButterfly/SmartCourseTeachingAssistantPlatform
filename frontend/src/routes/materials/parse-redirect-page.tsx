import { FileWarning } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMaterialQuery } from '@/features/material/queries'
import { resolveErrorMessage } from '@/lib/http'

/**
 * `/materials/:id/parse` 深链兜底页（PAD §6.2 v0.14）。
 *
 * 解析进度的**主路径**是课程详情页内联展示，本页只处理「外部直接打开解析深链」：
 * 用 `GET /materials/{id}` 反查所属课程，再重定向到 `/courses/{course_id}?tab=materials`
 * （Tab 深链约定见 PAD §6.1）。这样深链不会落在一个空白占位页上。
 */

/** 找不到资料 / id 非法时的统一兜底 */
function MissingMaterial({ title, description }: { title: string; description?: string }) {
  const navigate = useNavigate()

  return (
    <EmptyState
      className="mx-auto max-w-xl"
      icon={<FileWarning aria-hidden="true" className="size-5" />}
      title={title}
      description={description}
      action={
        <Button variant="outline" onClick={() => navigate('/courses', { replace: true })}>
          返回课程列表
        </Button>
      }
    />
  )
}

export function ParseRedirectPage() {
  const { id } = useParams()
  const materialId = Number(id)
  const isValidId = Number.isInteger(materialId) && materialId > 0
  const query = useMaterialQuery(isValidId ? materialId : 0)

  // id 非法时 query 处于 idle，直接给兜底而不是干等
  if (!isValidId) {
    return (
      <MissingMaterial title="资料 ID 无效" description="解析深链形如 /materials/123/parse。" />
    )
  }

  if (query.isPending) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-3" aria-busy="true">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64" />
        <p className="sr-only">正在定位资料所属课程…</p>
      </div>
    )
  }

  if (query.isError || query.data === undefined) {
    return (
      <MissingMaterial
        title="资料不存在或已删除"
        description={query.error ? resolveErrorMessage(query.error) : undefined}
      />
    )
  }

  return <Navigate to={`/courses/${query.data.course_id}?tab=materials`} replace />
}
