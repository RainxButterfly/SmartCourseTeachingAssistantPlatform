import { HttpResponse, type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { pushActivity } from '@/mocks/activity'
import { db, nextSequence, nowIso, syncCourseCounters } from '@/mocks/db'
import { fail, ok, paginate, readIntParam } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import {
  CompleteBodySchema,
  type Material,
  type MaterialFormat,
  type ParseStatus,
  PresignBodySchema,
} from '@/schemas/material'

const API = env.apiBaseUrl
const CURRENT_USER_ID = 1
const CURRENT_USER_NAME = '张三'

/** 直传目标：mock 阶段把预签名 URL 指回同源的 /mock-minio/*，由下方 handler 承接 */
const MOCK_MINIO_PREFIX = '/mock-minio'

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? 'bin'
}

function formatOf(fileName: string): MaterialFormat | null {
  const ext = extensionOf(fileName)
  switch (ext) {
    case 'pdf':
      return 'PDF'
    case 'pptx':
      return 'PPTX'
    case 'docx':
      return 'DOCX'
    case 'md':
      return 'MD'
    default:
      return null
  }
}

function findMaterial(id: number): Material | undefined {
  return db.materials.find((item) => item.id === id)
}

function updateCourseActiveTime(courseId: number): void {
  const course = db.courses.find((item) => item.id === courseId)
  if (course) {
    course.last_active_at = nowIso()
    course.updated_at = course.last_active_at
  }
}

/* ------------------------------ 上传三步走 ------------------------------ */

/** ① POST /materials/presign */
const presignMaterials: HttpResponseResolver = async ({ request }) => {
  const parsed = PresignBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { course_id: courseId, files } = parsed.data
  const course = db.courses.find((item) => item.id === courseId)
  if (!course) return fail(ERROR_CODES.NOT_FOUND, '课程不存在')

  const oversized = files.find((file) => file.size_bytes > 52_428_800)
  if (oversized) {
    return fail(ERROR_CODES.FILE_TOO_LARGE, `文件「${oversized.original_name}」超过 50MB 限制`)
  }

  const unsupported = files.find((file) => formatOf(file.original_name) === null)
  if (unsupported) {
    return fail(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      `不支持的文件格式「${unsupported.original_name}」，仅支持 PDF / PPTX / DOCX / MD`,
    )
  }

  const uploadBatchId = `batch_${Date.now().toString(36)}`
  const year = String(new Date().getFullYear())
  const month = String(new Date().getMonth() + 1).padStart(2, '0')

  const items = files.map((file) => {
    const materialId = nextSequence('material')
    const format = formatOf(file.original_name) ?? 'PDF'
    const objectKey = `course/${courseId}/${year}/${month}/${materialId}.${extensionOf(file.original_name)}`

    const material: Material = {
      id: materialId,
      course_id: courseId,
      name: file.original_name,
      original_name: file.original_name,
      object_key: objectKey,
      size_bytes: file.size_bytes,
      page_count: 0,
      format,
      status: 'UPLOADING',
      error_msg: null,
      version: 1,
      chunk_count: 0,
      uploaded_by: CURRENT_USER_ID,
      uploaded_by_name: CURRENT_USER_NAME,
      created_at: nowIso(),
    }
    db.materials.unshift(material)
    syncCourseCounters(courseId)

    return {
      client_file_id: file.client_file_id,
      material_id: materialId,
      object_key: objectKey,
      upload_url: `${MOCK_MINIO_PREFIX}/${objectKey}`,
      method: 'PUT' as const,
      headers: { 'Content-Type': file.content_type },
      max_size_bytes: 52_428_800,
    }
  })

  return ok({ upload_batch_id: uploadBatchId, expires_in: 900, items })
}

/** ③ POST /materials/complete */
const completeUpload: HttpResponseResolver = async ({ request }) => {
  const parsed = CompleteBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { items } = parsed.data
  const materialIds: number[] = []
  const taskId = nextSequence('task')

  for (const item of items) {
    const material = findMaterial(item.material_id)
    if (!material) return fail(ERROR_CODES.NOT_FOUND, `资料 ${item.material_id} 不存在`)

    material.status = 'PENDING'
    materialIds.push(material.id)

    db.parseStatusByMaterial[material.id] = {
      task_id: taskId,
      material_id: material.id,
      status: 'QUEUED',
      progress: 0,
      total_chunks: 0,
      indexed_chunks: 0,
      stage: '排队中',
      error_msg: null,
      started_at: null,
      finished_at: null,
    }
    updateCourseActiveTime(material.course_id)
  }

  return ok({ task_id: taskId, material_ids: materialIds, status: 'QUEUED' as const })
}

/** PUT /mock-minio/* —— 模拟 MinIO 接收直传字节 */
const mockMinioPut: HttpResponseResolver = () =>
  new HttpResponse(null, {
    status: 200,
    headers: { ETag: `"${Math.random().toString(16).slice(2, 10)}"` },
  })

/** GET /mock-minio/* —— 模拟预签名 GET 下载原文（便于前端「下载」链路可演示） */
const mockMinioGet: HttpResponseResolver = ({ request }) =>
  new HttpResponse(`mock 原文内容\n对象路径：${new URL(request.url).pathname}\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })

/* -------------------------------- 资料管理 -------------------------------- */

const listMaterials: HttpResponseResolver = ({ params, request }) => {
  const courseId = Number(params.id)
  if (!db.courses.some((item) => item.id === courseId)) {
    return fail(ERROR_CODES.NOT_FOUND, '课程不存在')
  }

  const params2 = new URL(request.url).searchParams
  const page = readIntParam(params2, 'page', 1)
  const size = readIntParam(params2, 'size', 20)
  const status = params2.get('status') ?? ''
  const keyword = (params2.get('keyword') ?? '').trim().toLowerCase()

  let list = db.materials.filter((item) => item.course_id === courseId)
  if (status !== '') list = list.filter((item) => item.status === status)
  if (keyword !== '') {
    list = list.filter((item) => item.name.toLowerCase().includes(keyword))
  }
  list.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return ok(paginate(list, page, size))
}

const getMaterial: HttpResponseResolver = ({ params }) => {
  const material = findMaterial(Number(params.id))
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')
  return ok(material)
}

/** PUT /materials/{id} —— 重命名 / 改备注 */
const updateMaterial: HttpResponseResolver = async ({ params, request }) => {
  const material = findMaterial(Number(params.id))
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')

  const body = (await readJson(request)) as { name?: unknown } | null
  const nextName = typeof body?.name === 'string' ? body.name.trim() : ''
  if (nextName.length === 0 || nextName.length > 255) {
    return fail(ERROR_CODES.INVALID_PARAM, '资料名称需 1-255 字')
  }

  material.name = nextName
  return ok(material)
}

const deleteMaterial: HttpResponseResolver = ({ params }) => {
  const id = Number(params.id)
  const material = findMaterial(id)
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')

  db.materials = db.materials.filter((item) => item.id !== id)
  delete db.parseStatusByMaterial[id]
  syncCourseCounters(material.course_id)

  // PAD §8：删除资料写一条活动流
  pushActivity({
    type: 'MATERIAL_DELETED',
    target_id: String(id),
    target_type: 'MATERIAL',
    title: `删除资料《${material.name}》`,
  })

  return ok({ id, deleted: true })
}

/** POST /materials/{id}/reparse —— 重新解析，版本号 +1 */
const reparseMaterial: HttpResponseResolver = ({ params }) => {
  const material = findMaterial(Number(params.id))
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')

  material.status = 'PENDING'
  material.error_msg = null
  material.version += 1
  material.chunk_count = 0

  const taskId = nextSequence('task')
  db.parseStatusByMaterial[material.id] = {
    task_id: taskId,
    material_id: material.id,
    status: 'QUEUED',
    progress: 0,
    total_chunks: 0,
    indexed_chunks: 0,
    stage: '排队中',
    error_msg: null,
    started_at: null,
    finished_at: null,
  }

  return ok({ task_id: taskId, material_ids: [material.id], status: 'QUEUED' as const })
}

/**
 * GET /materials/{id}/download —— 返回预签名 GET URL（mock 指回同源 /mock-minio）。
 * 注意：前端用 `window.open` 做顶层导航，而顶层导航不会被 Service Worker 接管，
 * 因此 mock 模式下会落到 SPA 的 404 路由。这是 mock 的固有限制，真实环境是 MinIO 域名，不受影响。
 */
const downloadMaterial: HttpResponseResolver = ({ params }) => {
  const material = findMaterial(Number(params.id))
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')

  return ok({
    material_id: material.id,
    url: `${MOCK_MINIO_PREFIX}/${material.object_key}`,
    file_name: material.name,
    expires_in: 900,
  })
}

/** 每次轮询推进一次解析进度，让前端进度条在 mock 下真实动起来 */
function advanceParseStatus(current: ParseStatus): ParseStatus {
  if (current.status === 'SUCCESS' || current.status === 'FAILED') return current

  const next: ParseStatus = { ...current }

  if (next.status === 'QUEUED') {
    next.status = 'RUNNING'
    next.stage = '解析中'
    next.started_at = nowIso()
    next.progress = 8
    return next
  }

  next.progress = Math.min(100, next.progress + 14)
  next.total_chunks = next.total_chunks === 0 ? 320 : next.total_chunks
  next.indexed_chunks = Math.round((next.total_chunks * next.progress) / 100)
  next.stage = next.progress < 45 ? '解析中' : '向量化中'

  if (next.progress >= 100) {
    next.status = 'SUCCESS'
    next.stage = '已完成'
    next.finished_at = nowIso()
  }

  return next
}

/** GET /materials/{id}/parse-status —— 前端轮询入口 */
const getParseStatus: HttpResponseResolver = ({ params }) => {
  const materialId = Number(params.id)
  const material = findMaterial(materialId)
  if (!material) return fail(ERROR_CODES.NOT_FOUND, '资料不存在')

  if (material.status === 'FAILED') {
    const failed = db.parseStatusByMaterial[materialId]
    return ok(
      failed ?? {
        task_id: 0,
        material_id: materialId,
        status: 'FAILED' as const,
        progress: 0,
        total_chunks: 0,
        indexed_chunks: 0,
        stage: '解析失败',
        error_msg: material.error_msg,
        started_at: null,
        finished_at: null,
      },
    )
  }

  const current = db.parseStatusByMaterial[materialId]
  const base: ParseStatus = current ?? {
    task_id: 0,
    material_id: materialId,
    status: 'SUCCESS',
    progress: 100,
    total_chunks: material.chunk_count,
    indexed_chunks: material.chunk_count,
    stage: '已完成',
    error_msg: null,
    started_at: null,
    finished_at: null,
  }

  const advanced = advanceParseStatus(base)
  db.parseStatusByMaterial[materialId] = advanced

  if (advanced.status === 'SUCCESS' && material.status !== 'READY') {
    material.status = 'READY'
    material.page_count = material.page_count === 0 ? 42 : material.page_count
    material.chunk_count = advanced.total_chunks

    // PAD §8：上传资料的活动挂在「解析完成」而非上传完成，避免活动流出现尚不可用的资料
    pushActivity({
      type: 'MATERIAL_UPLOADED',
      target_id: String(material.id),
      target_type: 'MATERIAL',
      title: `上传资料《${material.name}》并完成解析`,
    })
  } else if (advanced.status === 'RUNNING' && material.status !== 'EMBEDDING') {
    material.status = advanced.stage === '向量化中' ? 'EMBEDDING' : 'PARSING'
  }

  return ok(advanced)
}

/** multipart 直传兜底接口：mock 阶段不实现，明确提示走预签名 */
const multipartUploadNotImplemented: HttpResponseResolver = () =>
  fail(ERROR_CODES.INTERNAL, 'mock 未实现 multipart 直传，请使用预签名三步走')

export const materialHandlers = [
  http.put(`${MOCK_MINIO_PREFIX}/*`, mockMinioPut),
  http.get(`${MOCK_MINIO_PREFIX}/*`, mockMinioGet),
  http.post(`${API}/materials/presign`, presignMaterials),
  http.post(`${API}/materials/complete`, completeUpload),
  http.get(`${API}/courses/:id/materials`, listMaterials),
  http.post(`${API}/courses/:id/materials`, multipartUploadNotImplemented),
  // 三段的下载路径需早于 /materials/:id 注册
  http.get(`${API}/materials/:id/download`, downloadMaterial),
  http.get(`${API}/materials/:id`, getMaterial),
  http.put(`${API}/materials/:id`, updateMaterial),
  http.delete(`${API}/materials/:id`, deleteMaterial),
  http.post(`${API}/materials/:id/reparse`, reparseMaterial),
  http.get(`${API}/materials/:id/parse-status`, getParseStatus),
]
