import { HttpResponse } from 'msw'

import { createRequestId } from '@/lib/utils'
import { ERROR_CODES, ERROR_MESSAGES } from '@/schemas/common'

/** 与 PAD §9.10 的错误码 → HTTP 状态码映射 */
const HTTP_STATUS_BY_CODE: Record<number, number> = {
  [ERROR_CODES.INVALID_PARAM]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.HAS_CHILDREN]: 409,
  [ERROR_CODES.FILE_TOO_LARGE]: 413,
  [ERROR_CODES.UNSUPPORTED_FORMAT]: 415,
  [ERROR_CODES.PARSE_TASK_EXISTS]: 400,
  [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.MODEL_TIMEOUT]: 503,
  [ERROR_CODES.MATERIAL_NOT_READY]: 400,
  [ERROR_CODES.MODEL_NOT_CONFIGURED]: 503,
  [ERROR_CODES.INTERNAL]: 500,
}

/** 成功响应：统一 { code, message, data, trace_id } 包装 */
export function ok<T>(data: T): Response {
  return HttpResponse.json({
    code: ERROR_CODES.OK,
    message: 'ok',
    data,
    trace_id: createRequestId(),
  })
}

/** 失败响应：错误码决定 HTTP 状态码 */
export function fail(code: number, message?: string, data: unknown = null): Response {
  return HttpResponse.json(
    {
      code,
      message: message ?? ERROR_MESSAGES[code] ?? '请求失败',
      data,
      trace_id: createRequestId(),
    },
    { status: HTTP_STATUS_BY_CODE[code] ?? 400 },
  )
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
}

export function paginate<T>(items: T[], page: number, size: number): PageResult<T> {
  const start = (page - 1) * size
  return {
    list: items.slice(start, start + size),
    total: items.length,
    page,
    size,
  }
}

/** 从 URLSearchParams 中安全取整数 */
export function readIntParam(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw === null || raw === '') return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
