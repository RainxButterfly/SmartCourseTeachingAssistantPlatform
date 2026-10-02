import type { AxiosRequestConfig } from 'axios'

import { http } from '@/lib/http'
import {
  type CompleteBody,
  CompleteBodySchema,
  type DownloadResponse,
  DownloadResponseSchema,
  type Material,
  type MaterialListQuery,
  type MaterialListResponse,
  MaterialListResponseSchema,
  MaterialSchema,
  type ParseStatus,
  ParseStatusSchema,
  type PresignBody,
  PresignBodySchema,
  type PresignResponse,
  PresignResponseSchema,
  type UploadResponse,
  UploadResponseSchema,
} from '@/schemas/material'

/**
 * 资料管理接口层（含 MinIO 预签名三步走）。
 * 约定：响应统一由 Zod 兜底校验；请求体也做一次 schema 收口，避免拼错字段名。
 */

async function requestData(config: AxiosRequestConfig): Promise<unknown> {
  return http.request(config)
}

type QueryParams = Record<string, string | number>

function toListParams(query: MaterialListQuery): QueryParams {
  const params: QueryParams = { page: query.page, size: query.size }
  if (query.status !== undefined) params.status = query.status
  if (query.keyword !== undefined && query.keyword !== '') params.keyword = query.keyword
  return params
}

/** GET /courses/{id}/materials */
export async function fetchMaterialList(
  courseId: number,
  query: MaterialListQuery,
): Promise<MaterialListResponse> {
  const raw = await requestData({
    method: 'GET',
    url: `/courses/${courseId}/materials`,
    params: toListParams(query),
  })
  return MaterialListResponseSchema.parse(raw)
}

/** ① POST /materials/presign —— 申请预签名上传凭证 */
export async function presignMaterials(body: PresignBody): Promise<PresignResponse> {
  const raw = await requestData({
    method: 'POST',
    url: '/materials/presign',
    data: PresignBodySchema.parse(body),
  })
  return PresignResponseSchema.parse(raw)
}

/** ③ POST /materials/complete —— 上传完成确认，后端落库并投递解析任务 */
export async function completeUpload(body: CompleteBody): Promise<UploadResponse> {
  const raw = await requestData({
    method: 'POST',
    url: '/materials/complete',
    data: CompleteBodySchema.parse(body),
  })
  return UploadResponseSchema.parse(raw)
}

/** GET /materials/{id}/parse-status —— 解析进度轮询 */
export async function fetchParseStatus(materialId: number): Promise<ParseStatus> {
  const raw = await requestData({ method: 'GET', url: `/materials/${materialId}/parse-status` })
  return ParseStatusSchema.parse(raw)
}

/** PUT /materials/{id} —— 重命名 */
export async function renameMaterial(id: number, name: string): Promise<Material> {
  const raw = await requestData({ method: 'PUT', url: `/materials/${id}`, data: { name } })
  return MaterialSchema.parse(raw)
}

/** DELETE /materials/{id} —— 同步清理 MinIO 对象与 Milvus 向量由后端负责 */
export async function deleteMaterial(id: number): Promise<void> {
  await requestData({ method: 'DELETE', url: `/materials/${id}` })
}

/** POST /materials/{id}/reparse */
export async function reparseMaterial(id: number): Promise<UploadResponse> {
  const raw = await requestData({ method: 'POST', url: `/materials/${id}/reparse` })
  return UploadResponseSchema.parse(raw)
}

/** GET /materials/{id}/download —— 取预签名 GET URL 后由前端跳转 */
export async function fetchDownloadUrl(id: number): Promise<DownloadResponse> {
  const raw = await requestData({ method: 'GET', url: `/materials/${id}/download` })
  return DownloadResponseSchema.parse(raw)
}
