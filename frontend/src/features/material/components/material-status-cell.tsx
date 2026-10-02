import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useParseStatusQuery } from '@/features/material/queries'
import { queryKeys } from '@/lib/query-keys'
import {
  MATERIAL_IN_PROGRESS_STATUSES,
  MATERIAL_STATUS_LABELS,
  type Material,
} from '@/schemas/material'

/**
 * 资料状态单元格：行内展示「上传中 → 待解析 → 解析中 → 向量化中 → 已完成」。
 * 中间态期间以 1.5s 轮询 GET /materials/{id}/parse-status，到终态自动停表。
 */
export function MaterialStatusCell({ material }: { material: Material }) {
  const queryClient = useQueryClient()
  const refreshedRef = useRef(false)

  // UPLOADING 尚未 complete，后端还没有解析任务，不轮询
  const shouldPoll =
    material.status !== 'UPLOADING' && MATERIAL_IN_PROGRESS_STATUSES.includes(material.status)
  const { data } = useParseStatusQuery(material.id, shouldPoll)

  // 到达终态后回刷列表：否则状态徽标与页数 / 切片数会停留在解析前的旧快照
  useEffect(() => {
    if (refreshedRef.current) return
    if (data?.status !== 'SUCCESS' && data?.status !== 'FAILED') return
    refreshedRef.current = true
    void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all() })
  }, [data?.status, queryClient])

  if (material.status === 'FAILED') {
    return (
      <div className="space-y-1">
        <Badge variant="destructive">失败</Badge>
        {material.error_msg ? (
          <p className="max-w-64 text-pretty text-destructive text-xs">{material.error_msg}</p>
        ) : null}
      </div>
    )
  }

  if (material.status === 'READY') {
    return <Badge variant="default">已完成</Badge>
  }

  const progress = data?.progress ?? 0
  const stage = data?.stage ?? MATERIAL_STATUS_LABELS[material.status]

  return (
    <div className="w-40 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{stage}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {data === undefined ? '—' : `${progress}%`}
        </span>
      </div>
      <Progress value={progress} aria-label={`${material.name} 解析进度`} />
    </div>
  )
}
