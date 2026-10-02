import { z } from 'zod'

import { IdSchema, IsoDateTimeSchema, PageQuerySchema, PageResultSchema } from '@/schemas/common'

/* ------------------- 智能出题（PAD §7.6 / §9.7 v0.10） ------------------- */

export const QUIZ_TYPES = ['SINGLE', 'MULTIPLE', 'FILL', 'ESSAY'] as const
export const QuizTypeSchema = z.enum(QUIZ_TYPES)
export type QuizType = z.infer<typeof QuizTypeSchema>

export const QUIZ_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export const QuizDifficultySchema = z.enum(QUIZ_DIFFICULTIES)
export type QuizDifficulty = z.infer<typeof QuizDifficultySchema>

/** 组卷可选题量（PAD §6.2 QuizPage） */
export const QUIZ_COUNT_OPTIONS = [5, 10, 15, 20] as const

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  SINGLE: '单选',
  MULTIPLE: '多选',
  FILL: '填空',
  ESSAY: '简答',
}

export const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
}

/** 题目附带的资料出处（比 `Citation` 少 index / score） */
export const QuizCitationSchema = z.object({
  material_id: IdSchema,
  title: z.string().min(1),
  page: z.number().int().min(0),
  snippet: z.string(),
})
export type QuizCitation = z.infer<typeof QuizCitationSchema>

/** 客户端视角的题目：**不含 answer / explanation**（防作弊） */
export const QuizQuestionSchema = z.object({
  id: IdSchema,
  type: QuizTypeSchema,
  stem: z.string().min(1),
  /** SINGLE / MULTIPLE 为选项文本；FILL / ESSAY 为 [] */
  options: z.array(z.string()),
  citations: z.array(QuizCitationSchema),
})
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

/** POST /quiz/generate 请求体 */
export const QuizGenerateBodySchema = z.object({
  /** 出题范围：0 = 全部资料 */
  course_id: z.number().int().min(0).default(0),
  count: z.number().int().min(1).max(20),
  types: z.array(QuizTypeSchema).min(1, '至少选择一种题型'),
  difficulty: QuizDifficultySchema,
  weak_points: z.array(z.string().min(1)).optional(),
})
export type QuizGenerateBody = z.input<typeof QuizGenerateBodySchema>

/** POST /quiz/generate 响应：生成即建作答，故回传 attempt_id */
export const QuizGenerateResponseSchema = z.object({
  attempt_id: IdSchema,
  total: z.number().int().min(1),
  questions: z.array(QuizQuestionSchema),
})
export type QuizGenerateResponse = z.infer<typeof QuizGenerateResponseSchema>

/** 作答值：单选/填空/简答为字符串，多选为字符串数组 */
export const QuizAnswerValueSchema = z.union([z.string(), z.array(z.string())])
export type QuizAnswerValue = z.infer<typeof QuizAnswerValueSchema>

/** POST /quiz/attempts 请求体：key 为 String(question_id)，未作答的题不出现 */
export const QuizSubmitBodySchema = z.object({
  attempt_id: IdSchema,
  answers: z.record(z.string(), QuizAnswerValueSchema),
  duration_ms: z.number().int().min(0),
})
export type QuizSubmitBody = z.infer<typeof QuizSubmitBodySchema>

/** 结果明细：含题干与选项回显，否则结果页无法复现题目 */
export const QuizResultDetailSchema = z.object({
  question_id: IdSchema,
  type: QuizTypeSchema,
  stem: z.string(),
  options: z.array(z.string()),
  correct: z.boolean(),
  /** 未作答为 null；多选为选项文本按「、」连接 */
  user_answer: z.string().nullable(),
  right_answer: z.string(),
  explanation: z.string(),
  citations: z.array(QuizCitationSchema),
})
export type QuizResultDetail = z.infer<typeof QuizResultDetailSchema>

/** GET /quiz/attempts/{id} 响应 */
export const QuizResultSchema = z.object({
  attempt_id: IdSchema,
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  score: z.number().int().min(0).max(100),
  duration_ms: z.number().int().min(0),
  details: z.array(QuizResultDetailSchema),
  weak_points_generated: z.array(z.string()),
})
export type QuizResult = z.infer<typeof QuizResultSchema>

/** GET /quiz/attempts 列表项 */
export const QuizAttemptSummarySchema = z.object({
  id: IdSchema,
  course_id: z.number().int().min(0),
  course_name: z.string(),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  score: z.number().int().min(0).max(100),
  duration_ms: z.number().int().min(0),
  created_at: IsoDateTimeSchema,
})
export type QuizAttemptSummary = z.infer<typeof QuizAttemptSummarySchema>

export const QuizAttemptListQuerySchema = PageQuerySchema.extend({
  course_id: z.coerce.number().int().min(0).optional(),
})
export type QuizAttemptListQuery = z.infer<typeof QuizAttemptListQuerySchema>

export const QuizAttemptListResponseSchema = PageResultSchema(QuizAttemptSummarySchema)
export type QuizAttemptListResponse = z.infer<typeof QuizAttemptListResponseSchema>

/** 薄弱知识点：score 为掌握度 0~1，越低越薄弱 */
export const WeakPointSchema = z.object({
  point_name: z.string().min(1),
  score: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
})
export type WeakPoint = z.infer<typeof WeakPointSchema>

export const WeakPointListResponseSchema = z.object({ items: z.array(WeakPointSchema) })
export type WeakPointListResponse = z.infer<typeof WeakPointListResponseSchema>

/** 各题型的作答是否视为「已作答」（空串与空数组都算未作答） */
export function isAnswered(value: QuizAnswerValue | undefined): boolean {
  return formatAnswerLabel(value) !== null
}

/** 把作答值归一成展示串（多选用「、」连接）；空作答返回 null */
export function formatAnswerLabel(value: QuizAnswerValue | undefined): string | null {
  if (value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
  return value.length === 0 ? null : value.join('、')
}
