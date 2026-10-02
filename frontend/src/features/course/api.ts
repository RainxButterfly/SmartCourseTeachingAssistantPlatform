import type { AxiosRequestConfig } from 'axios'

import { ApiError, http } from '@/lib/http'
import { createRequestId } from '@/lib/utils'
import { ERROR_CODES } from '@/schemas/common'
import {
  type Course,
  type CourseCodeCheckResponse,
  CourseCodeCheckResponseSchema,
  type CourseDeleteConflict,
  CourseDeleteConflictSchema,
  type CourseDetail,
  CourseDetailSchema,
  type CourseListQuery,
  type CourseListResponse,
  CourseListResponseSchema,
  CourseSchema,
  type CourseUpsertBody,
  type SemesterListResponse,
  SemesterListResponseSchema,
} from '@/schemas/course'

/**
 * 课程管理接口层。
 * 说明：http 的响应拦截器已解包统一 envelope，这里统一用 Zod 兜底校验后才把数据交给业务层，
 * 因此任何字段漂移都会在接口层直接暴露，而不是等渲染时才炸。
 */

/** 返回未校验的 data（类型为 unknown，交给调用方的 Zod schema 收口） */
async function requestData(config: AxiosRequestConfig): Promise<unknown> {
  return http.request(config)
}

type QueryParams = Record<string, string | number | boolean>

function toListParams(query: CourseListQuery): QueryParams {
  const params: QueryParams = {
    page: query.page,
    size: query.size,
    sort: query.sort,
  }
  if (query.keyword !== undefined && query.keyword !== '') params.keyword = query.keyword
  if (query.mine !== undefined) params.mine = query.mine
  if (query.semester !== undefined && query.semester !== '') params.semester = query.semester
  return params
}

/** GET /courses —— 分页 + 搜索 + 筛选 + 排序 */
export async function fetchCourseList(query: CourseListQuery): Promise<CourseListResponse> {
  const raw = await requestData({ method: 'GET', url: '/courses', params: toListParams(query) })
  return CourseListResponseSchema.parse(raw)
}

/** GET /courses/semesters —— 学期字典（筛选与表单下拉共用） */
export async function fetchSemesters(): Promise<SemesterListResponse> {
  const raw = await requestData({ method: 'GET', url: '/courses/semesters' })
  return SemesterListResponseSchema.parse(raw)
}

/** GET /courses/{id} —— 详情（含统计概览），课程表单编辑态需要回填 */
export async function fetchCourseDetail(id: number): Promise<CourseDetail> {
  const raw = await requestData({ method: 'GET', url: `/courses/${id}` })
  return CourseDetailSchema.parse(raw)
}

/** POST /courses —— 新建；带幂等键防重复提交 */
export async function createCourse(body: CourseUpsertBody): Promise<Course> {
  const raw = await requestData({
    method: 'POST',
    url: '/courses',
    data: body,
    headers: { 'X-Idempotency-Key': createRequestId() },
  })
  return CourseSchema.parse(raw)
}

/** PUT /courses/{id} —— 编辑 */
export async function updateCourse(id: number, body: CourseUpsertBody): Promise<Course> {
  const raw = await requestData({ method: 'PUT', url: `/courses/${id}`, data: body })
  return CourseSchema.parse(raw)
}

/** GET /courses/check-code —— 表单失焦即调的唯一性预检 */
export async function fetchCourseCodeCheck(
  code: string,
  excludeId?: number,
): Promise<CourseCodeCheckResponse> {
  const raw = await requestData({
    method: 'GET',
    url: '/courses/check-code',
    params: excludeId === undefined ? { code } : { code, exclude_id: excludeId },
  })
  return CourseCodeCheckResponseSchema.parse(raw)
}

/**
 * 预检的容错包装：网络或服务异常一律返回 null（调用方视为「放行」）。
 * 唯一性最终由提交时的 1005 兜底裁决，不因预检失败而拦住用户。
 */
export async function fetchCourseCodeCheckSafe(
  code: string,
  excludeId?: number,
): Promise<CourseCodeCheckResponse | null> {
  try {
    return await fetchCourseCodeCheck(code, excludeId)
  } catch {
    return null
  }
}

/** DELETE /courses/{id} —— cascade=false 且存在子资源时后端返回 1006 */
export async function deleteCourse(id: number, cascade: boolean): Promise<void> {
  await requestData({ method: 'DELETE', url: `/courses/${id}`, params: { cascade } })
}

/**
 * 从 1006 异常中取出待删除的子资源数量，供二次确认弹窗展示。
 * 非该场景一律返回 null（调用方按普通错误处理）。
 */
export function readDeleteConflict(error: unknown): CourseDeleteConflict | null {
  if (!(error instanceof ApiError) || !error.isChildrenConflict) return null
  const parsed = CourseDeleteConflictSchema.safeParse(error.payload)
  return parsed.success ? parsed.data : null
}

/**
 * 课程编号是否与既有课程冲突（错误码 1005）。
 * 用于把服务端唯一性校验结果映射到表单的 code 字段上，而不是抛通用 toast。
 */
export function isCourseCodeConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === ERROR_CODES.CONFLICT
}
