import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  type UploadPhase,
  type UploadRejection,
  type UploadTask,
  uploadMaterials,
  validateUploadFiles,
} from '@/features/material/upload'
import { resolveErrorMessage } from '@/lib/http'
import { queryKeys } from '@/lib/query-keys'
import { createRequestId } from '@/lib/utils'

interface UseMaterialUploadResult {
  tasks: UploadTask[]
  rejections: UploadRejection[]
  isUploading: boolean
  start: (files: File[]) => Promise<void>
  cancel: () => void
  dismissTasks: () => void
  dismissRejections: () => void
}

/**
 * 上传编排与本地任务态。
 * 上传完成后 invalidate 资料列表 → 新行以 QUEUED 出现，随后由行内轮询接管解析进度。
 */
export function useMaterialUpload(courseId: number): UseMaterialUploadResult {
  const queryClient = useQueryClient()
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [rejections, setRejections] = useState<UploadRejection[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateTask = useCallback((clientFileId: string, patch: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((task) => (task.clientFileId === clientFileId ? { ...task, ...patch } : task)),
    )
  }, [])

  const start = useCallback(
    async (files: File[]) => {
      const { accepted, rejected } = validateUploadFiles(files)
      setRejections(rejected)

      if (rejected.length > 0) {
        toast.error(`${rejected.length} 个文件未通过校验，原因见上传区`)
      }
      if (accepted.length === 0) return

      const inputs = accepted.map((file) => ({
        clientFileId: `tmp_${createRequestId()}`,
        file,
      }))

      setTasks(
        inputs.map((input) => ({
          clientFileId: input.clientFileId,
          fileName: input.file.name,
          sizeBytes: input.file.size,
          progress: 0,
          phase: 'uploading' as UploadPhase,
        })),
      )

      const controller = new AbortController()
      abortRef.current = controller
      setIsUploading(true)

      try {
        const outcome = await uploadMaterials({
          courseId,
          inputs,
          signal: controller.signal,
          onTaskUpdate: updateTask,
        })

        setTasks((prev) =>
          prev.map((task) =>
            task.phase === 'failed' ? task : { ...task, phase: 'done', progress: 100 },
          ),
        )
        await queryClient.invalidateQueries({ queryKey: queryKeys.materials.all() })

        if (outcome.failed.length === 0) {
          toast.success(`已提交 ${outcome.materialIds.length} 份资料，正在解析`)
        } else {
          toast.warning(
            `已提交 ${outcome.materialIds.length} 份，${outcome.failed.length} 份直传失败`,
          )
        }
      } catch (error) {
        const message = resolveErrorMessage(error)
        setTasks((prev) =>
          prev.map((task) =>
            task.phase === 'done'
              ? task
              : { ...task, phase: 'failed', error: task.error ?? message },
          ),
        )
        toast.error(message)
      } finally {
        setIsUploading(false)
        abortRef.current = null
      }
    },
    [courseId, queryClient, updateTask],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const dismissTasks = useCallback(() => setTasks([]), [])
  const dismissRejections = useCallback(() => setRejections([]), [])

  return { tasks, rejections, isUploading, start, cancel, dismissTasks, dismissRejections }
}
