import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import { env } from '@/lib/env'
import { createRequestId } from '@/lib/utils'
import { ApiEnvelopeBaseSchema, ERROR_CODES, ERROR_MESSAGES } from '@/schemas/common'

/** 统一业务异常：所有失败路径最终都收敛到 ApiError */
export class ApiError extends Error {
  readonly code: number
  readonly status: number
  readonly traceId: string | undefined
  readonly payload: unknown

  constructor(params: {
    code: number
    message: string
    status: number
    traceId?: string | undefined
    payload?: unknown
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.traceId = params.traceId
    this.payload = params.payload
  }

  /** 是否为「课程下仍有子资源」冲突（前端需弹二次确认） */
  get isChildrenConflict(): boolean {
    return this.code === ERROR_CODES.HAS_CHILDREN
  }
}

/** HTTP 状态码 → 业务错误码兜底映射（后端未返回 envelope 时使用） */
const HTTP_STATUS_TO_CODE: Record<number, number> = {
  400: ERROR_CODES.INVALID_PARAM,
  401: ERROR_CODES.UNAUTHORIZED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  413: ERROR_CODES.FILE_TOO_LARGE,
  415: ERROR_CODES.UNSUPPORTED_FORMAT,
  503: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
}

interface HttpAuthBridge {
  getAccessToken: () => string | null
  onUnauthorized: () => void
  /** 可选：401 时用 refresh token 换新 access token */
  refresh?: () => Promise<string | null>
}

let authBridge: HttpAuthBridge = {
  getAccessToken: () => null,
  onUnauthorized: () => undefined,
}

/** 由 auth-store 在模块初始化时注入，避免 lib 层反向依赖 store */
export function configureHttpAuth(bridge: HttpAuthBridge): void {
  authBridge = bridge
}

/**
 * 刷新一次 access token（失败返回 null）。
 * 供**非 axios 通道**复用 —— SSE 用 fetch，无法经过下面的响应拦截器。
 */
export async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!authBridge.refresh) return null
  return authBridge.refresh().catch(() => null)
}

/**
 * 清空本地会话（对应拦截器里不可恢复的 401）。
 * 同上，供非 axios 通道在「刷新失败 / 重放仍 401」时保持行为一致（PAD §7.1）。
 */
export function clearSessionOnUnauthorized(): void {
  authBridge.onUnauthorized()
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  __retried?: boolean
  __skipAuth?: boolean
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config: RetriableConfig) => {
  config.headers.set('X-Request-Id', createRequestId())
  if (!config.__skipAuth) {
    const token = authBridge.getAccessToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const parsed = ApiEnvelopeBaseSchema.safeParse(response.data)
    if (!parsed.success) {
      // 非标准响应体（如文件流）直接透传
      return response.data
    }
    const envelope = parsed.data
    if (envelope.code !== ERROR_CODES.OK) {
      throw new ApiError({
        code: envelope.code,
        message: envelope.message || (ERROR_MESSAGES[envelope.code] ?? '请求失败'),
        status: response.status,
        traceId: envelope.trace_id ?? undefined,
        payload: envelope.data,
      })
    }
    return envelope.data
  },
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      throw new ApiError({
        code: ERROR_CODES.INTERNAL,
        message: '客户端发生未知异常',
        status: 0,
      })
    }

    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status ?? 0

    // 401：尝试刷新一次 token 后重放原请求
    if (status === 401 && config && !config.__retried && authBridge.refresh) {
      config.__retried = true
      const nextToken = await authBridge.refresh().catch(() => null)
      if (nextToken) {
        config.headers.set('Authorization', `Bearer ${nextToken}`)
        return http.request(config)
      }
    }

    if (status === 401) {
      authBridge.onUnauthorized()
    }

    const envelope = ApiEnvelopeBaseSchema.safeParse(error.response?.data)
    if (envelope.success && envelope.data.code !== ERROR_CODES.OK) {
      throw new ApiError({
        code: envelope.data.code,
        message: envelope.data.message || (ERROR_MESSAGES[envelope.data.code] ?? '请求失败'),
        status,
        traceId: envelope.data.trace_id ?? undefined,
        payload: envelope.data.data,
      })
    }

    const fallbackCode = HTTP_STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL
    const fallbackMessage =
      status === 0
        ? '网络异常，请检查网络后重试'
        : (ERROR_MESSAGES[fallbackCode] ?? '服务开小差了，稍后重试')

    throw new ApiError({ code: fallbackCode, message: fallbackMessage, status })
  },
)

/** 从任意异常中提取用户可读文案，供 sonner toast 与内联错误态使用 */
export function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '发生未知错误，请稍后重试'
}
