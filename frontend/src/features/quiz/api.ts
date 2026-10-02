import { http } from '@/lib/http'
import {
  type QuizAttemptListQuery,
  type QuizAttemptListResponse,
  QuizAttemptListResponseSchema,
  type QuizGenerateBody,
  QuizGenerateBodySchema,
  type QuizGenerateResponse,
  QuizGenerateResponseSchema,
  type QuizResult,
  QuizResultSchema,
  type QuizSubmitBody,
  QuizSubmitBodySchema,
  type WeakPointListResponse,
  WeakPointListResponseSchema,
} from '@/schemas/quiz'

/** 智能出题接口层（PAD §7.6） */

type QueryParams = Record<string, string | number>

/** POST /quiz/generate —— 生成题目并创建作答记录 */
export async function generateQuiz(body: QuizGenerateBody): Promise<QuizGenerateResponse> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/quiz/generate',
    data: QuizGenerateBodySchema.parse(body),
  })
  return QuizGenerateResponseSchema.parse(raw)
}

/** POST /quiz/attempts —— 提交作答，直接返回结果 */
export async function submitQuiz(body: QuizSubmitBody): Promise<QuizResult> {
  const raw = await http.request<unknown>({
    method: 'POST',
    url: '/quiz/attempts',
    data: QuizSubmitBodySchema.parse(body),
  })
  return QuizResultSchema.parse(raw)
}

/** GET /quiz/attempts/{id} —— 结果（深链/刷新进入时使用） */
export async function fetchQuizResult(attemptId: number): Promise<QuizResult> {
  const raw = await http.request<unknown>({ method: 'GET', url: `/quiz/attempts/${attemptId}` })
  return QuizResultSchema.parse(raw)
}

/** GET /quiz/attempts —— 历史作答记录 */
export async function fetchQuizAttempts(
  query: QuizAttemptListQuery,
): Promise<QuizAttemptListResponse> {
  const params: QueryParams = { page: query.page, size: query.size }
  if (query.course_id !== undefined && query.course_id > 0) params.course_id = query.course_id

  const raw = await http.request<unknown>({ method: 'GET', url: '/quiz/attempts', params })
  return QuizAttemptListResponseSchema.parse(raw)
}

/** GET /quiz/weak-points —— 薄弱知识点排行（按掌握度升序） */
export async function fetchWeakPoints(courseId: number): Promise<WeakPointListResponse> {
  const raw = await http.request<unknown>({
    method: 'GET',
    url: '/quiz/weak-points',
    params: { course_id: courseId },
  })
  return WeakPointListResponseSchema.parse(raw)
}
