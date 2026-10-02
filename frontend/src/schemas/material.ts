import { z } from 'zod'

import {
  IdSchema,
  IsoDateTimeSchema,
  NullableIsoDateTimeSchema,
  NullableStringSchema,
  PageQuerySchema,
  PageResultSchema,
} from '@/schemas/common'

/* ------------------------------- 资料管理 ------------------------------- */

/** 资料状态机：上传中 → 待解析 → 解析中 → 向量化中 → 已完成 / 失败 */
export const MATERIAL_STATUSES = [
  'UPLOADING',
  'PENDING',
  'PARSING',
  'EMBEDDING',
  'READY',
  'FAILED',
] as const
export const MaterialStatusSchema = z.enum(MATERIAL_STATUSES)
export type MaterialStatus = z.infer<typeof MaterialStatusSchema>

export const MaterialFormatSchema = z.enum(['PDF', 'PPTX', 'DOCX', 'MD'])
export type MaterialFormat = z.infer<typeof MaterialFormatSchema>

/** 状态 → 中文文案 */
export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  UPLOADING: '上传中',
  PENDING: '待解析',
  PARSING: '解析中',
  EMBEDDING: '向量化中',
  READY: '已完成',
  FAILED: '失败',
}

/** 处于中间态、需要前端轮询的状态集合 */
export const MATERIAL_IN_PROGRESS_STATUSES: readonly MaterialStatus[] = [
  'UPLOADING',
  'PENDING',
  'PARSING',
  'EMBEDDING',
]

export const MaterialSchema = z.object({
  id: IdSchema,
  course_id: IdSchema,
  name: z.string().min(1).max(255),
  original_name: z.string().min(1).max(255),
  object_key: z.string().min(1).max(512),
  size_bytes: z.number().int().min(0),
  page_count: z.number().int().min(0),
  format: MaterialFormatSchema,
  status: MaterialStatusSchema,
  error_msg: NullableStringSchema,
  version: z.number().int().min(1),
  chunk_count: z.number().int().min(0),
  uploaded_by: IdSchema,
  uploaded_by_name: z.string(),
  created_at: IsoDateTimeSchema,
})
export type Material = z.infer<typeof MaterialSchema>

export const MaterialListQuerySchema = PageQuerySchema.extend({
  status: MaterialStatusSchema.optional(),
  keyword: z.string().max(255).optional(),
})
export type MaterialListQuery = z.infer<typeof MaterialListQuerySchema>

export const MaterialListResponseSchema = PageResultSchema(MaterialSchema)
export type MaterialListResponse = z.infer<typeof MaterialListResponseSchema>

/* --------------------------- 上传第一步：presign --------------------------- */

export const PresignFileSchema = z.object({
  /** 前端本次上传的临时标识，用于把 presign 结果与本地 File 对上 */
  client_file_id: z.string().min(1).max(64),
  original_name: z.string().min(1).max(255),
  size_bytes: z.number().int().positive(),
  content_type: z.string().min(1),
  sha256: z.string().length(64).nullish(),
})
export type PresignFile = z.infer<typeof PresignFileSchema>

export const PresignBodySchema = z.object({
  course_id: IdSchema,
  files: z.array(PresignFileSchema).min(1, '至少选择 1 个文件').max(10, '单次最多上传 10 个文件'),
})
export type PresignBody = z.infer<typeof PresignBodySchema>

export const PresignItemSchema = z.object({
  client_file_id: z.string().min(1),
  material_id: IdSchema,
  object_key: z.string().min(1),
  upload_url: z.string().min(1),
  method: z.literal('PUT'),
  headers: z.record(z.string()),
  max_size_bytes: z.number().int().positive(),
})
export type PresignItem = z.infer<typeof PresignItemSchema>

export const PresignResponseSchema = z.object({
  upload_batch_id: z.string().min(1),
  /** 预签名有效期（秒） */
  expires_in: z.number().int().positive(),
  items: z.array(PresignItemSchema),
})
export type PresignResponse = z.infer<typeof PresignResponseSchema>

/* --------------------------- 上传第三步：complete --------------------------- */

export const CompleteItemSchema = z.object({
  client_file_id: z.string().min(1),
  material_id: IdSchema,
  etag: z.string().nullish(),
  sha256: z.string().nullish(),
})
export type CompleteItem = z.infer<typeof CompleteItemSchema>

export const CompleteBodySchema = z.object({
  upload_batch_id: z.string().min(1),
  items: z.array(CompleteItemSchema).min(1),
})
export type CompleteBody = z.infer<typeof CompleteBodySchema>

export const UploadResponseSchema = z.object({
  task_id: IdSchema,
  material_ids: z.array(IdSchema),
  status: z.literal('QUEUED'),
})
export type UploadResponse = z.infer<typeof UploadResponseSchema>

/** GET /materials/{id}/download —— 原文以预签名 GET URL 交付 */
export const DownloadResponseSchema = z.object({
  material_id: IdSchema,
  url: z.string().min(1),
  file_name: z.string().min(1),
  expires_in: z.number().int().positive(),
})
export type DownloadResponse = z.infer<typeof DownloadResponseSchema>

/* ---------------------------- 解析任务状态轮询 ---------------------------- */

export const PARSE_TASK_STATUSES = ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED'] as const
export const ParseTaskStatusSchema = z.enum(PARSE_TASK_STATUSES)
export type ParseTaskStatus = z.infer<typeof ParseTaskStatusSchema>

export const ParseStatusSchema = z.object({
  task_id: IdSchema,
  material_id: IdSchema,
  status: ParseTaskStatusSchema,
  /** 0-100 */
  progress: z.number().int().min(0).max(100),
  total_chunks: z.number().int().min(0),
  indexed_chunks: z.number().int().min(0),
  /** 展示用阶段文案，如「向量化中」 */
  stage: z.string(),
  error_msg: NullableStringSchema,
  started_at: NullableIsoDateTimeSchema,
  finished_at: NullableIsoDateTimeSchema,
})
export type ParseStatus = z.infer<typeof ParseStatusSchema>

/* --------------------------------- 工具 --------------------------------- */

/** 依据文件名推断格式，用于上传前本地预校验（对应错误码 2002） */
export function detectMaterialFormat(fileName: string): MaterialFormat | null {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
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

export function formatToContentType(format: MaterialFormat): string {
  switch (format) {
    case 'PDF':
      return 'application/pdf'
    case 'PPTX':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case 'DOCX':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'MD':
      return 'text/markdown'
  }
}
