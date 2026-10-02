import { FileText } from 'lucide-react'
import { useMemo } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialTable } from '@/features/material/components/material-table'
import { UploadDropzone } from '@/features/material/components/upload-dropzone'
import { useMaterialListQuery } from '@/features/material/queries'
import { useMaterialUpload } from '@/features/material/use-material-upload'
import { usePageParam } from '@/hooks/use-page-param'
import { resolveErrorMessage } from '@/lib/http'
import { formatBytes } from '@/lib/utils'
import type { MaterialListQuery } from '@/schemas/material'

/** 资料列表每页条数（PAD §6.2 v0.5） */
const MATERIAL_PAGE_SIZE = 10

interface MaterialPanelProps {
  courseId: number
}

export function MaterialPanel({ courseId }: MaterialPanelProps) {
  const { page, setPage, resetPage } = usePageParam()
  const query = useMemo<MaterialListQuery>(() => ({ page, size: MATERIAL_PAGE_SIZE }), [page])
  const { data, isPending, isError, error, refetch } = useMaterialListQuery(courseId, query)
  const upload = useMaterialUpload(courseId)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1

  // 新上传的资料固定落在最新位置，提交后回到第 1 页才能被看到（PAD §6.2 v0.5）
  const handleFilesSelected = async (files: File[]): Promise<void> => {
    await upload.start(files)
    resetPage()
  }

  return (
    <div className="space-y-4">
      <UploadDropzone
        onFilesSelected={(files) => void handleFilesSelected(files)}
        disabled={upload.isUploading}
      />

      {upload.rejections.length > 0 ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="font-medium text-destructive text-sm">以下文件未通过上传前校验</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground text-xs">
            {upload.rejections.map((item) => (
              <li key={`${item.fileName}|${item.reason}`}>
                {item.fileName}：{item.reason}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={upload.dismissRejections}
          >
            知道了
          </Button>
        </div>
      ) : null}

      {upload.tasks.length > 0 ? (
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium text-sm">上传队列</p>
            {upload.isUploading ? (
              <Button type="button" variant="outline" size="sm" onClick={upload.cancel}>
                取消上传
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={upload.dismissTasks}>
                清除记录
              </Button>
            )}
          </div>
          <ul className="space-y-2">
            {upload.tasks.map((task) => (
              <li
                key={task.clientFileId}
                className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm" title={task.fileName}>
                  {task.fileName}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatBytes(task.sizeBytes)}
                </span>
                {task.phase === 'failed' ? (
                  <span className="text-destructive text-xs">{task.error ?? '上传失败'}</span>
                ) : task.phase === 'done' ? (
                  <span className="text-muted-foreground text-xs">已提交解析</span>
                ) : (
                  <div className="w-28">
                    <Progress value={task.progress} aria-label={`${task.fileName} 上传进度`} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isPending ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : null}

      {isError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive">资料加载失败</p>
          <p className="mt-1 text-muted-foreground text-sm">{resolveErrorMessage(error)}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void refetch()}
          >
            重试
          </Button>
        </div>
      ) : null}

      {data ? (
        data.list.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-5" />}
            title="还没有资料"
            description="上传课程讲义、笔记或试卷，系统会自动解析并构建可检索的知识库。"
          />
        ) : (
          <>
            <MaterialTable materials={data.list} />
            <nav
              aria-label="资料分页"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <p className="text-muted-foreground text-sm">
                共 {data.total} 份资料
                {data.total > data.size ? ` · 第 ${data.page} / ${totalPages} 页` : ''}
              </p>
              {data.total > data.size ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={data.page <= 1}
                    onClick={() => setPage(data.page - 1)}
                  >
                    上一页
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={data.page >= totalPages}
                    onClick={() => setPage(data.page + 1)}
                  >
                    下一页
                  </Button>
                </div>
              ) : null}
            </nav>
          </>
        )
      ) : null}
    </div>
  )
}
