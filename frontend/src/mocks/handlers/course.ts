import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { pushActivity } from '@/mocks/activity'
import { db, nextSequence, nowIso, syncCourseCounters } from '@/mocks/db'
import { fail, ok, paginate, readIntParam } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import { type Course, type CourseStats, CourseUpsertBodySchema } from '@/schemas/course'

const API = env.apiBaseUrl
const CURRENT_USER_ID = 1
const CURRENT_USER_NAME = '张三'

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function findCourse(id: number): Course | undefined {
  return db.courses.find((item) => item.id === id)
}

function buildStats(course: Course): CourseStats {
  const materials = db.materials.filter((item) => item.course_id === course.id)
  const conversations = db.conversations.filter((item) => item.course_id === course.id)
  return {
    material_count: materials.length,
    ready_material_count: materials.filter((item) => item.status === 'READY').length,
    conversation_count: conversations.length,
    question_count: conversations.reduce((sum, item) => sum + item.message_count, 0),
    quiz_accuracy: 0.76,
    last_active_at: course.last_active_at,
  }
}

/** 学期排序权重：同年秋 > 同年春，年份大者优先 */
function semesterRank(value: string): number {
  const year = Number.parseInt(value.slice(0, 4), 10)
  const isAutumn = value.endsWith('秋')
  return (Number.isFinite(year) ? year : 0) * 2 + (isAutumn ? 1 : 0)
}

/**
 * GET /courses/semesters —— 学期字典。
 * ⚠️ 必须注册在 `/courses/:id` 之前，否则会被动态段吃掉。
 */
const listSemesters: HttpResponseResolver = () => {
  const counts = new Map<string, number>()
  for (const course of db.courses) {
    if (course.semester === '') continue
    counts.set(course.semester, (counts.get(course.semester) ?? 0) + 1)
  }

  const items = [...counts.entries()]
    .map(([value, courseCount]) => ({ value, course_count: courseCount }))
    .sort((a, b) => semesterRank(b.value) - semesterRank(a.value))

  return ok({ items })
}

/**
 * GET /courses/check-code —— 课程编号唯一性预检（表单失焦即调）。
 * ⚠️ 必须注册在 `/courses/:id` 之前。
 */
const checkCourseCode: HttpResponseResolver = ({ request }) => {
  const params = new URL(request.url).searchParams
  const code = (params.get('code') ?? '').trim()
  const excludeRaw = params.get('exclude_id')
  const excludeId = excludeRaw === null || excludeRaw === '' ? null : Number(excludeRaw)

  if (code === '') {
    return fail(ERROR_CODES.INVALID_PARAM, 'code 不能为空')
  }

  const conflict = db.courses.find(
    (item) => item.code.toLowerCase() === code.toLowerCase() && item.id !== excludeId,
  )

  return ok({
    code,
    available: conflict === undefined,
    conflict_course_id: conflict?.id ?? null,
    conflict_course_name: conflict?.name ?? null,
  })
}

/** GET /courses —— 分页 + 搜索 + 筛选 + 排序 */
const listCourses: HttpResponseResolver = ({ request }) => {
  const params = new URL(request.url).searchParams
  const page = readIntParam(params, 'page', 1)
  const size = readIntParam(params, 'size', 12)
  const keyword = (params.get('keyword') ?? '').trim().toLowerCase()
  const mine = params.get('mine') === 'true'
  const semester = params.get('semester') ?? ''
  const sort = params.get('sort') ?? 'recent'

  let list = db.courses.slice()

  if (mine) list = list.filter((item) => item.owner_id === CURRENT_USER_ID)
  if (semester !== '') list = list.filter((item) => item.semester === semester)
  if (keyword !== '') {
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.teacher.toLowerCase().includes(keyword),
    )
  }

  switch (sort) {
    case 'name':
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
      break
    case 'created':
      list.sort((a, b) => b.created_at.localeCompare(a.created_at))
      break
    default:
      list.sort((a, b) =>
        (b.last_active_at ?? b.created_at).localeCompare(a.last_active_at ?? a.created_at),
      )
  }

  return ok(paginate(list, page, size))
}

/** POST /courses —— 新建，课程编号唯一（否则 1005） */
const createCourse: HttpResponseResolver = async ({ request }) => {
  const parsed = CourseUpsertBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const body = parsed.data
  if (db.courses.some((item) => item.code === body.code)) {
    return fail(ERROR_CODES.CONFLICT, '课程编号已存在')
  }

  const now = nowIso()
  const course: Course = {
    id: nextSequence('course'),
    name: body.name,
    code: body.code,
    semester: body.semester,
    teacher: body.teacher,
    color: body.color,
    description: body.description,
    visibility: body.visibility,
    owner_id: CURRENT_USER_ID,
    owner_name: CURRENT_USER_NAME,
    material_count: 0,
    conversation_count: 0,
    last_active_at: null,
    created_at: now,
    updated_at: now,
  }

  db.courses.unshift(course)

  // PAD §8：创建课程写一条活动流
  pushActivity({
    type: 'COURSE_CREATED',
    target_id: String(course.id),
    target_type: 'COURSE',
    title: `创建课程「${course.name}」`,
  })

  return ok(course)
}

/** GET /courses/{id} —— 详情（含统计概览） */
const getCourseDetail: HttpResponseResolver = ({ params }) => {
  const id = Number(params.id)
  const course = findCourse(id)
  if (!course) return fail(ERROR_CODES.NOT_FOUND, '课程不存在')
  syncCourseCounters(id)
  return ok({ ...course, stats: buildStats(course) })
}

/** PUT /courses/{id} —— 编辑，编号唯一性需排除自身 */
const updateCourse: HttpResponseResolver = async ({ params, request }) => {
  const id = Number(params.id)
  const course = findCourse(id)
  if (!course) return fail(ERROR_CODES.NOT_FOUND, '课程不存在')

  const parsed = CourseUpsertBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const body = parsed.data
  if (db.courses.some((item) => item.code === body.code && item.id !== id)) {
    return fail(ERROR_CODES.CONFLICT, '课程编号已存在')
  }

  Object.assign(course, body, { updated_at: nowIso() })
  return ok(course)
}

/** DELETE /courses/{id} —— 未显式 cascade 且存在子资源时返回 1006 */
const deleteCourse: HttpResponseResolver = ({ params, request }) => {
  const id = Number(params.id)
  const course = findCourse(id)
  if (!course) return fail(ERROR_CODES.NOT_FOUND, '课程不存在')

  const cascade = new URL(request.url).searchParams.get('cascade') === 'true'
  const materialCount = db.materials.filter((item) => item.course_id === id).length
  const conversationCount = db.conversations.filter((item) => item.course_id === id).length

  if (!cascade && (materialCount > 0 || conversationCount > 0)) {
    return fail(
      ERROR_CODES.HAS_CHILDREN,
      `该课程下仍有 ${materialCount} 份资料、${conversationCount} 个会话，确认后将一并删除`,
      { material_count: materialCount, conversation_count: conversationCount },
    )
  }

  db.materials = db.materials.filter((item) => item.course_id !== id)
  db.conversations = db.conversations.filter((item) => item.course_id !== id)
  db.courses = db.courses.filter((item) => item.id !== id)

  return ok({ id, deleted: true })
}

/** GET /courses/{id}/stats —— 课程维度统计 */
const getCourseStats: HttpResponseResolver = ({ params }) => {
  const course = findCourse(Number(params.id))
  if (!course) return fail(ERROR_CODES.NOT_FOUND, '课程不存在')
  return ok(buildStats(course))
}

export const courseHandlers = [
  http.get(`${API}/courses`, listCourses),
  // 字面量路径必须早于 /courses/:id 注册
  http.get(`${API}/courses/semesters`, listSemesters),
  http.get(`${API}/courses/check-code`, checkCourseCode),
  http.post(`${API}/courses`, createCourse),
  http.get(`${API}/courses/:id`, getCourseDetail),
  http.put(`${API}/courses/:id`, updateCourse),
  http.delete(`${API}/courses/:id`, deleteCourse),
  http.get(`${API}/courses/:id/stats`, getCourseStats),
]
