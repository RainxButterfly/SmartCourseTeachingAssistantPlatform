import { completeUpload, presignMaterials } from '@/features/material/api'
import { ALLOWED_MATERIAL_FORMATS, env, MAX_UPLOAD_BYTES } from '@/lib/env'
import { detectMaterialFormat, formatToContentType } from '@/schemas/material'

/**
 * MinIO 预签名三步走的第二步与编排（PAD §7.3）。
 * ① presign 取凭证 → ② 直传 MinIO → ③ complete 落库并投递解析任务
 */

export type UploadPhase = 'uploading' | 'confirming' | 'done' | 'failed'

export interface UploadTask {
  clientFileId: string
  fileName: string
  sizeBytes: number
  /** 直传字节进度 0-100 */
  progress: number
  phase: UploadPhase
  error?: string
}

export interface UploadRejection {
  fileName: string
  reason: string
}

export interface UploadInput {
  clientFileId: string
  file: File
}

export interface UploadOutcome {
  taskId: number
  materialIds: number[]
  /** 直传失败的文件（不影响其余文件继续完成） */
  failed: UploadRejection[]
}

/** 上传前本地预校验，提前拦掉后端必然会用 2001 / 2002 拒绝的文件 */
export function validateUploadFiles(files: File[]): {
  accepted: File[]
  rejected: UploadRejection[]
} {
  const accepted: File[] = []
  const rejected: UploadRejection[] = []

  for (const file of files) {
    if (detectMaterialFormat(file.name) === null) {
      rejected.push({
        fileName: file.name,
        reason: `不支持的文件格式，仅支持 ${ALLOWED_MATERIAL_FORMATS.join(' / ')}`,
      })
      continue
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({ fileName: file.name, reason: `超过 ${env.maxUploadMb}MB 大小限制` })
      continue
    }
    accepted.push(file)
  }

  return { accepted, rejected }
}

/**
 * 直传 MinIO。刻意用 XHR 而非 fetch：fetch 无法观测上传进度，
 * 而 PAD §6.2 要求上传区展示进度条。
 */
function putToPresignedUrl(params: {
  url: string
  file: File
  headers: Record<string, string>
  signal?: AbortSignal
  onProgress: (percent: number) => void
}): Promise<string> {
  const { url, file, headers, signal, onProgress } = params

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader('ETag') ?? '')
        return
      }
      reject(new Error(`直传失败（HTTP ${xhr.status}）`))
    })
    xhr.addEventListener('error', () => reject(new Error('直传失败（网络异常）')))
    xhr.addEventListener('abort', () => reject(new DOMException('已取消上传', 'AbortError')))

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    xhr.send(file)
  })
}

export interface UploadMaterialsParams {
  courseId: number
  inputs: UploadInput[]
  signal?: AbortSignal
  onTaskUpdate: (clientFileId: string, patch: Partial<UploadTask>) => void
}

export async function uploadMaterials(params: UploadMaterialsParams): Promise<UploadOutcome> {
  const { courseId, inputs, signal, onTaskUpdate } = params

  const presigned = await presignMaterials({
    course_id: courseId,
    files: inputs.map((input) => {
      const format = detectMaterialFormat(input.file.name)
      return {
        client_file_id: input.clientFileId,
        original_name: input.file.name,
        size_bytes: input.file.size,
        content_type:
          input.file.type !== ''
            ? input.file.type
            : format === null
              ? 'application/octet-stream'
              : formatToContentType(format),
        sha256: null,
      }
    }),
  })

  const itemByClientId = new Map(presigned.items.map((item) => [item.client_file_id, item]))
  const succeeded: Array<{
    client_file_id: string
    material_id: number
    etag: string | null
    sha256: string | null
  }> = []
  const failed: UploadRejection[] = []

  // 并行直传：单个文件失败不影响其余文件
  await Promise.all(
    inputs.map(async (input) => {
      const item = itemByClientId.get(input.clientFileId)
      if (item === undefined) {
        onTaskUpdate(input.clientFileId, { phase: 'failed', error: '未获得上传凭证' })
        failed.push({ fileName: input.file.name, reason: '未获得上传凭证' })
        return
      }

      try {
        const etag = await putToPresignedUrl({
          url: item.upload_url,
          file: input.file,
          headers: item.headers,
          signal,
          onProgress: (percent) => onTaskUpdate(input.clientFileId, { progress: percent }),
        })
        onTaskUpdate(input.clientFileId, { progress: 100, phase: 'confirming' })
        succeeded.push({
          client_file_id: input.clientFileId,
          material_id: item.material_id,
          etag: etag === '' ? null : etag,
          sha256: null,
        })
      } catch (error) {
        const reason =
          error instanceof DOMException
            ? '已取消上传'
            : error instanceof Error
              ? error.message
              : '上传失败'
        onTaskUpdate(input.clientFileId, { phase: 'failed', error: reason })
        failed.push({ fileName: input.file.name, reason })
      }
    }),
  )

  if (succeeded.length === 0) {
    throw new Error('全部文件上传失败，请检查网络后重试')
  }

  const completed = await completeUpload({
    upload_batch_id: presigned.upload_batch_id,
    items: succeeded,
  })

  return { taskId: completed.task_id, materialIds: completed.material_ids, failed }
}
