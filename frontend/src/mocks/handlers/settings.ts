import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { db, nowIso } from '@/mocks/db'
import { fail, ok } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import {
  type ModelConfig,
  ModelConfigRequestSchema,
  ModelTestRequestSchema,
} from '@/schemas/settings'

const API = env.apiBaseUrl

/** mock 探活耗时固定，便于断言；真实后端返回实测值 */
const MOCK_LATENCY_MS = 186

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

/** 掩码规则：保留前 3 位与后 4 位（与后端保持一致，永不回显明文） */
function maskApiKey(apiKey: string): string {
  if (apiKey === '') return ''
  if (apiKey.length <= 8) return '****'
  return `${apiKey.slice(0, 3)}****${apiKey.slice(-4)}`
}

/** 对外视角：抹掉明文密钥，只给掩码（PAD §7.8 / §9.9） */
function toModelConfig(): ModelConfig {
  const config = db.modelConfig
  return {
    provider: config.provider,
    base_url: config.base_url,
    model: config.model,
    api_key_masked: maskApiKey(config.api_key),
    has_api_key: config.api_key !== '',
    updated_at: config.updated_at,
  }
}

/** GET /settings/model */
const getModelConfig: HttpResponseResolver = () => ok(toModelConfig())

/** PUT /settings/model —— 写入配置文件；`api_key` 省略或空串表示保留原值 */
const putModelConfig: HttpResponseResolver = async ({ request }) => {
  const parsed = ModelConfigRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { provider, base_url: baseUrl, model, api_key: apiKey } = parsed.data
  db.modelConfig = {
    provider,
    base_url: baseUrl,
    model,
    api_key: apiKey === undefined || apiKey === '' ? db.modelConfig.api_key : apiKey,
    updated_at: nowIso(),
  }

  return ok(toModelConfig())
}

/** POST /settings/model/test —— 只探活，不落配置 */
const testModelConfig: HttpResponseResolver = async ({ request }) => {
  const parsed = ModelTestRequestSchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { model, api_key: apiKey } = parsed.data
  const resolvedKey = apiKey === undefined || apiKey === '' ? db.modelConfig.api_key : apiKey

  if (resolvedKey === '') {
    return ok({ ok: false, latency_ms: 0, message: '尚未配置 API Key，请先填写' })
  }
  // 调试开关：密钥含 invalid 时模拟鉴权失败，便于演示与测试失败分支
  if (resolvedKey.includes('invalid')) {
    return ok({ ok: false, latency_ms: 0, message: 'API Key 无效或已过期' })
  }

  return ok({ ok: true, latency_ms: MOCK_LATENCY_MS, message: `连接成功，模型 ${model} 可用` })
}

export const settingsHandlers = [
  http.get(`${API}/settings/model`, getModelConfig),
  http.put(`${API}/settings/model`, putModelConfig),
  http.post(`${API}/settings/model/test`, testModelConfig),
]
