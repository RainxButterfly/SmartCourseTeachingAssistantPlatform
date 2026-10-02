/** 运行期环境变量读取与兜底，禁止在业务代码里直接读 import.meta.env */

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  enableMock: toBoolean(import.meta.env.VITE_ENABLE_MOCK, false),
  maxUploadMb: toNumber(import.meta.env.VITE_MAX_UPLOAD_MB, 50),
  sseIdleTimeoutMs: toNumber(import.meta.env.VITE_SSE_IDLE_TIMEOUT_MS, 30_000),
  mockAutoLogin: toBoolean(import.meta.env.VITE_MOCK_AUTO_LOGIN, true),
} as const

/** 单文件上传上限（字节），与后端 2001 错误码阈值一致 */
export const MAX_UPLOAD_BYTES = env.maxUploadMb * 1024 * 1024

/** 允许上传的资料格式，与后端 2002 错误码白名单一致 */
export const ALLOWED_MATERIAL_FORMATS = ['PDF', 'PPTX', 'DOCX', 'MD'] as const
