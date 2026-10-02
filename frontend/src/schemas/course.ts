import { z } from 'zod'

import {
  IdSchema,
  IsoDateTimeSchema,
  NullableIsoDateTimeSchema,
  OptionalBooleanQuerySchema,
  PageQuerySchema,
  PageResultSchema,
  WireIdSchema,
} from '@/schemas/common'

/* ------------------------------- 课程管理 ------------------------------- */

/** 可见性：PRIVATE=仅我，PUBLIC=全部 */
export const CourseVisibilitySchema = z.enum(['PRIVATE', 'PUBLIC'])
export type CourseVisibility = z.infer<typeof CourseVisibilitySchema>

export const CourseSortSchema = z.enum(['recent', 'name', 'created'])
export type CourseSort = z.infer<typeof CourseSortSchema>

/** 课程编号规则：2-32 位字母/数字/下划线/中划线 */
export const COURSE_CODE_PATTERN = /^[A-Za-z0-9_-]{2,32}$/

/** 预设封面色板（CourseFormPage 色板取值） */
export const COURSE_COLOR_PRESETS = [
  '#7c9cff',
  '#5ec8a8',
  '#f2b45c',
  '#e5739b',
  '#a78bfa',
  '#4fb3d9',
] as const

export const CourseSchema = z.object({
  id: IdSchema,
  name: z.string().min(2).max(50),
  code: z.string().regex(COURSE_CODE_PATTERN),
  semester: z.string().max(20),
  teacher: z.string().max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string().max(200),
  visibility: CourseVisibilitySchema,
  owner_id: IdSchema,
  owner_name: z.string(),
  material_count: z.number().int().min(0),
  conversation_count: z.number().int().min(0),
  last_active_at: NullableIsoDateTimeSchema,
  created_at: IsoDateTimeSchema,
  updated_at: IsoDateTimeSchema,
})
export type Course = z.infer<typeof CourseSchema>

export const CourseStatsSchema = z.object({
  material_count: z.number().int().min(0),
  ready_material_count: z.number().int().min(0),
  conversation_count: z.number().int().min(0),
  question_count: z.number().int().min(0),
  quiz_accuracy: z.number().min(0).max(1),
  last_active_at: NullableIsoDateTimeSchema,
})
export type CourseStats = z.infer<typeof CourseStatsSchema>

/** 课程详情 = CourseVO + stats */
export const CourseDetailSchema = CourseSchema.extend({ stats: CourseStatsSchema })
export type CourseDetail = z.infer<typeof CourseDetailSchema>

/** GET /courses 查询参数 */
export const CourseListQuerySchema = PageQuerySchema.extend({
  keyword: z.string().max(50).optional(),
  mine: OptionalBooleanQuerySchema,
  semester: z.string().max(20).optional(),
  sort: CourseSortSchema.default('recent'),
})
export type CourseListQuery = z.infer<typeof CourseListQuerySchema>

export const CourseListResponseSchema = PageResultSchema(CourseSchema)
export type CourseListResponse = z.infer<typeof CourseListResponseSchema>

/** POST /courses 与 PUT /courses/{id} 请求体 */
export const CourseUpsertBodySchema = z.object({
  name: z.string().trim().min(2, '课程名称需 2-50 字').max(50, '课程名称需 2-50 字'),
  code: z
    .string()
    .trim()
    .regex(COURSE_CODE_PATTERN, '课程编号为 2-32 位字母、数字、下划线或中划线'),
  semester: z.string().trim().max(20).default(''),
  teacher: z.string().trim().max(50).default(''),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, '封面色必须为 6 位 HEX')
    .default('#7c9cff'),
  description: z.string().trim().max(200, '简介不超过 200 字').default(''),
  visibility: CourseVisibilitySchema.default('PRIVATE'),
})
export type CourseUpsertBody = z.infer<typeof CourseUpsertBodySchema>

/** DELETE /courses/{id} 查询参数 */
export const CourseDeleteQuerySchema = z.object({
  cascade: OptionalBooleanQuerySchema,
})
export type CourseDeleteQuery = z.infer<typeof CourseDeleteQuerySchema>

/** DELETE /courses/{id} 且 cascade=false 时的冲突载荷（错误码 1006） */
export const CourseDeleteConflictSchema = z.object({
  material_count: z.number().int().min(0),
  conversation_count: z.number().int().min(0),
})
export type CourseDeleteConflict = z.infer<typeof CourseDeleteConflictSchema>

/** GET /courses/semesters —— 学期字典 */
export const SemesterOptionSchema = z.object({
  value: z.string().min(1).max(20),
  course_count: z.number().int().min(0),
})
export type SemesterOption = z.infer<typeof SemesterOptionSchema>

export const SemesterListResponseSchema = z.object({
  items: z.array(SemesterOptionSchema),
})
export type SemesterListResponse = z.infer<typeof SemesterListResponseSchema>

/** GET /courses/check-code —— 课程编号唯一性预检 */
export const CourseCodeCheckResponseSchema = z.object({
  code: z.string(),
  available: z.boolean(),
  /** available=false 时给出冲突课程，便于提示「已被《操作系统》占用」 */
  conflict_course_id: IdSchema.nullish(),
  conflict_course_name: z.string().nullish(),
})
export type CourseCodeCheckResponse = z.infer<typeof CourseCodeCheckResponseSchema>

/**
 * 课程表单 schema（**前端表单专用**）。
 * 与 CourseUpsertBodySchema 的差异：不带 `default`，从而 `z.input === z.output`，
 * RHF 的泛型推断才不会与 resolver 打架；同时错误文案面向用户。
 * 线路层契约仍以 CourseUpsertBodySchema 为准（mock 与后端共用同一份）。
 */
export const CourseFormSchema = z.object({
  name: z.string().trim().min(2, '课程名称需 2-50 字').max(50, '课程名称需 2-50 字'),
  code: z
    .string()
    .trim()
    .regex(COURSE_CODE_PATTERN, '课程编号为 2-32 位字母、数字、下划线或中划线'),
  semester: z.string().trim().max(20, '学期不超过 20 字'),
  teacher: z.string().trim().max(50, '教师姓名不超过 50 字'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '请选择封面主题色'),
  description: z.string().trim().max(200, '简介不超过 200 字'),
  visibility: CourseVisibilitySchema,
})
export type CourseFormValues = z.infer<typeof CourseFormSchema>

/* ---------------------------- 会话（课程详情问答 Tab 复用） ---------------------------- */

export const ConversationBriefSchema = z.object({
  id: WireIdSchema,
  title: z.string(),
  course_id: z.number().int().min(0),
  course_name: z.string(),
  message_count: z.number().int().min(0),
  last_message_at: NullableIsoDateTimeSchema,
  created_at: IsoDateTimeSchema,
})
export type ConversationBrief = z.infer<typeof ConversationBriefSchema>
