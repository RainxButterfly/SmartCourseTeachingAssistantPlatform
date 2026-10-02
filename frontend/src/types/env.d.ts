/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 接口基础地址，默认 /api/v1 */
  readonly VITE_API_BASE_URL?: string
  /** 是否启用 MSW 接口 mock */
  readonly VITE_ENABLE_MOCK?: string
  /** 单文件上传上限（MB） */
  readonly VITE_MAX_UPLOAD_MB?: string
  /** SSE 静默超时（毫秒） */
  readonly VITE_SSE_IDLE_TIMEOUT_MS?: string
  /** mock 模式下是否预置本地会话（默认 true） */
  readonly VITE_MOCK_AUTO_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
