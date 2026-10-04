import { z } from 'zod'

/**
 * 统一响应包装 —— 与 PAD §7 一致：{ code, message, data, trace_id }
 * 所有接口字段一律 snake_case，前后端零转换。
 */
export function ApiEnvelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    code: z.number().int(),
    message: z.string(),
    data,
    trace_id: z.string().nullish(),
  })
}

export const ApiEnvelopeBaseSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown(),
  trace_id: z.string().nullish(),
})

export type ApiEnvelopeBase = z.infer<typeof ApiEnvelopeBaseSchema>

/** 分页请求参数（page 从 1 开始，size 上限 50） */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(50).default(12),
})

/** 分页响应体 */
export function PageResultSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    list: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    size: z.number().int().min(1),
  })
}

/** 数值主键：course_id / material_id / task_id / user_id */
export const IdSchema = z.number().int().positive()

/** 线路层 ID：会话 / 消息的主键对外为数字字符串（避免 JS 大整数精度问题） */
export const WireIdSchema = z.string().min(1)

/** ISO-8601 本地时间字符串，如 2026-10-02T10:00:00 */
export const IsoDateTimeSchema = z.string().min(1)

/** 可空时间字段 */
export const NullableIsoDateTimeSchema = IsoDateTimeSchema.nullable()

/** 可空字符串字段（后端用 null 表达"无值"） */
export const NullableStringSchema = z.string().nullable()

/** query 里的布尔值必须显式解析，避免 z.coerce.boolean("false") === true 的坑 */
export const OptionalBooleanQuerySchema = z.preprocess(
  (value) => (value === 'true' ? true : value === 'false' ? false : value),
  z.boolean().optional(),
)

/** 与 PAD §9.10 一一对应的业务错误码 */
export const ERROR_CODES = {
  OK: 0,
  INVALID_PARAM: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,
  CONFLICT: 1005,
  HAS_CHILDREN: 1006,
  /** 改密码原密码不正确（PAD v0.14；不可用 1002 代替，否则触发 401 刷新链路误登出） */
  INVALID_OLD_PASSWORD: 1007,
  /** 验证码不正确或已过期（重置密码专用；错误/过期/邮箱未注册统一返回此码，防枚举） */
  INVALID_VERIFICATION_CODE: 1008,
  /** 请求过于频繁（验证码 60s 重发间隔 / 单邮箱每日上限） */
  TOO_MANY_REQUESTS: 1009,
  FILE_TOO_LARGE: 2001,
  UNSUPPORTED_FORMAT: 2002,
  PARSE_TASK_EXISTS: 2003,
  AI_SERVICE_UNAVAILABLE: 3001,
  MODEL_TIMEOUT: 3002,
  MATERIAL_NOT_READY: 3003,
  MODEL_NOT_CONFIGURED: 3004,
  INTERNAL: 9000,
} as const

export type ErrorCodeValue = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** 错误码 → 用户可读文案（前端兜底，优先使用后端 message） */
export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.INVALID_PARAM]: '请求参数无效',
  [ERROR_CODES.UNAUTHORIZED]: '登录状态已失效，请重新登录',
  [ERROR_CODES.FORBIDDEN]: '没有操作权限',
  [ERROR_CODES.NOT_FOUND]: '资源不存在',
  [ERROR_CODES.CONFLICT]: '资源已存在',
  [ERROR_CODES.HAS_CHILDREN]: '该资源下仍有子内容',
  [ERROR_CODES.INVALID_OLD_PASSWORD]: '原密码不正确',
  [ERROR_CODES.INVALID_VERIFICATION_CODE]: '验证码不正确或已过期',
  [ERROR_CODES.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [ERROR_CODES.FILE_TOO_LARGE]: '文件超过大小限制',
  [ERROR_CODES.UNSUPPORTED_FORMAT]: '不支持的文件格式',
  [ERROR_CODES.PARSE_TASK_EXISTS]: '解析任务已存在',
  [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: 'AI 服务暂不可用，请稍后重试',
  [ERROR_CODES.MODEL_TIMEOUT]: '模型调用超时，请稍后重试',
  [ERROR_CODES.MATERIAL_NOT_READY]: '资料尚未解析完成',
  [ERROR_CODES.MODEL_NOT_CONFIGURED]: '尚未配置大模型，请先在设置中完成配置',
  [ERROR_CODES.INTERNAL]: '服务开小差了，稍后重试',
}
