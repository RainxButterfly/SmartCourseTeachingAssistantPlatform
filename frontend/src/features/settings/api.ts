import { http } from '@/lib/http'
import {
  type ModelConfig,
  type ModelConfigRequest,
  ModelConfigRequestSchema,
  ModelConfigSchema,
  type ModelTestRequest,
  ModelTestRequestSchema,
  type ModelTestResult,
  ModelTestResultSchema,
} from '@/schemas/settings'

/**
 * 系统设置接口层（PAD §7.8）。
 * 大模型配置为 BYOK：前端只负责录入，后端写入受保护的配置文件，接口永不回传明文密钥。
 */

/** GET /settings/model */
export async function fetchModelConfig(): Promise<ModelConfig> {
  const raw = await http.request<unknown>({ method: 'GET', url: '/settings/model' })
  return ModelConfigSchema.parse(raw)
}

/** PUT /settings/model —— `api_key` 省略或空串表示保留已保存的密钥 */
export async function saveModelConfig(body: ModelConfigRequest): Promise<ModelConfig> {
  const raw = await http.request<unknown>({
    method: 'PUT',
    url: '/settings/model',
    data: ModelConfigRequestSchema.parse(body),
  })
  return ModelConfigSchema.parse(raw)
}

/** POST /settings/model/test —— 探活一次，不落配置 */
export async function testModelConnection(body: ModelTestRequest): Promise<ModelTestResult> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/settings/model/test',
    data: ModelTestRequestSchema.parse(body),
  })
  return ModelTestResultSchema.parse(raw)
}
