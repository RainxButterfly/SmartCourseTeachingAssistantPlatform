import { z } from 'zod'

import { NullableIsoDateTimeSchema } from '@/schemas/common'

/* ---------------------- 大模型配置（PAD §7.8 / §9.9 v0.7） ---------------------- */

/** 厂商预设枚举：CUSTOM 表示用户自填任意 OpenAI 兼容端点 */
export const MODEL_PROVIDERS = ['DEEPSEEK', 'OPENAI', 'QWEN', 'CUSTOM'] as const
export const ModelProviderSchema = z.enum(MODEL_PROVIDERS)
export type ModelProvider = z.infer<typeof ModelProviderSchema>

/** GET/PUT /settings/model 响应；API Key 只回显掩码，永不返回明文 */
export const ModelConfigSchema = z.object({
  provider: ModelProviderSchema,
  base_url: z.string(),
  model: z.string(),
  api_key_masked: z.string(),
  has_api_key: z.boolean(),
  updated_at: NullableIsoDateTimeSchema,
})
export type ModelConfig = z.infer<typeof ModelConfigSchema>

/** PUT /settings/model 请求体；`api_key` 省略或传空串表示保留已保存的密钥 */
export const ModelConfigRequestSchema = z.object({
  provider: ModelProviderSchema,
  base_url: z.string().trim().url('API 地址需为合法 URL').max(300, 'API 地址不超过 300 字'),
  model: z.string().trim().min(1, '请填写模型名').max(100, '模型名不超过 100 字'),
  api_key: z.string().trim().max(200, 'API Key 不超过 200 字').optional(),
})
export type ModelConfigRequest = z.infer<typeof ModelConfigRequestSchema>

/** POST /settings/model/test 请求体：与保存一致，`api_key` 省略时用已保存的密钥 */
export const ModelTestRequestSchema = ModelConfigRequestSchema
export type ModelTestRequest = z.infer<typeof ModelTestRequestSchema>

/** POST /settings/model/test 响应 */
export const ModelTestResultSchema = z.object({
  ok: z.boolean(),
  latency_ms: z.number().int().min(0),
  message: z.string(),
})
export type ModelTestResult = z.infer<typeof ModelTestResultSchema>
