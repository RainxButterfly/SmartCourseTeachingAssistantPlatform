import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { pushActivity } from '@/mocks/activity'
import { db, nowIso } from '@/mocks/db'
import { quizBankFixtures, weakPointFixtures } from '@/mocks/fixtures/quiz'
import { fail, ok, paginate, readIntParam } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import {
  formatAnswerLabel,
  type QuizAnswerValue,
  type QuizCitation,
  QuizGenerateBodySchema,
  QuizSubmitBodySchema,
  type QuizType,
} from '@/schemas/quiz'

const API = env.apiBaseUrl

/** 作答记录（对应 t_quiz_attempt） */
interface QuizAttemptRecord {
  id: number
  course_id: number
  course_name: string
  total: number
  correct: number
  score: number
  duration_ms: number
  weak_points: string[]
  created_at: string
  submitted: boolean
}

/** 题目（对应 t_quiz_question）：**含服务端答案，绝不下发给客户端** */
interface QuizQuestionRecord {
  id: number
  attempt_id: number
  type: QuizType
  stem: string
  options: string[]
  answer: string | string[]
  explanation: string
  citations: QuizCitation[]
  point: string
  user_answer: QuizAnswerValue | null
  is_correct: boolean | null
}

/**
 * 出题状态放在 handler 模块内而非共享 db：它是「一次作答」的临时数据，
 * 这样也避免为它扩宽 db.sequences 的类型契约；测试用 resetQuizStore() 复位。
 */
const quizStore = {
  attempts: [] as QuizAttemptRecord[],
  questions: [] as QuizQuestionRecord[],
  attemptSeq: 1000,
  questionSeq: 5000,
}

export function resetQuizStore(): void {
  quizStore.attempts = []
  quizStore.questions = []
  quizStore.attemptSeq = 1000
  quizStore.questionSeq = 5000
}

function nextAttemptId(): number {
  quizStore.attemptSeq += 1
  return quizStore.attemptSeq
}

function nextQuestionId(): number {
  quizStore.questionSeq += 1
  return quizStore.questionSeq
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

/** 判分：选择题按选项文本比对（多选无序），填空忽略大小写，简答由模型评估（mock 简化为非空即对） */
function gradeAnswer(question: QuizQuestionRecord, answer: QuizAnswerValue | undefined): boolean {
  if (formatAnswerLabel(answer) === null) return false

  switch (question.type) {
    case 'SINGLE':
      return answer === question.answer
    case 'MULTIPLE': {
      if (!Array.isArray(answer)) return false
      const right = Array.isArray(question.answer) ? question.answer : [question.answer]
      return answer.length === right.length && right.every((item) => answer.includes(item))
    }
    case 'FILL':
      return typeof answer === 'string' && typeof question.answer === 'string'
        ? normalizeText(answer) === normalizeText(question.answer)
        : false
    case 'ESSAY':
      return true
  }
}

/** 客户端视角的题目：剥掉 answer / explanation（防作弊，PAD §7.6 v0.10） */
function toClientQuestion(question: QuizQuestionRecord) {
  return {
    id: question.id,
    type: question.type,
    stem: question.stem,
    options: question.options,
    citations: question.citations,
  }
}

function questionsOfAttempt(attemptId: number): QuizQuestionRecord[] {
  return quizStore.questions.filter((item) => item.attempt_id === attemptId)
}

function toQuizResult(attempt: QuizAttemptRecord, questions: QuizQuestionRecord[]) {
  return {
    attempt_id: attempt.id,
    total: attempt.total,
    correct: attempt.correct,
    score: attempt.score,
    duration_ms: attempt.duration_ms,
    details: questions.map((question) => ({
      question_id: question.id,
      type: question.type,
      stem: question.stem,
      options: question.options,
      correct: question.is_correct === true,
      user_answer: formatAnswerLabel(question.user_answer ?? undefined),
      right_answer: formatAnswerLabel(question.answer),
      explanation: question.explanation,
      citations: question.citations,
    })),
    weak_points_generated: attempt.weak_points,
  }
}

/** POST /quiz/generate —— 生成题目并同时创建作答记录 */
const generateQuiz: HttpResponseResolver = async ({ request }) => {
  const parsed = QuizGenerateBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  // 与问答一致：未配置大模型时直接拒绝
  if (db.modelConfig.api_key === '') {
    return fail(ERROR_CODES.MODEL_NOT_CONFIGURED)
  }

  const { course_id: courseId, count, types, difficulty, weak_points: weakPoints } = parsed.data

  const scoped = quizBankFixtures.filter(
    (item) =>
      (courseId === 0 || item.course_id === courseId) &&
      types.includes(item.type) &&
      item.difficulty === difficulty,
  )
  if (scoped.length === 0) {
    return fail(ERROR_CODES.INVALID_PARAM, '当前条件下没有可用题目，请放宽题型或难度后重试')
  }

  // 指定薄弱点时优先出题，其余随机性由固定顺序保证可断言
  const preferred =
    weakPoints === undefined ? [] : scoped.filter((i) => weakPoints.includes(i.point))
  const rest = scoped.filter((item) => !preferred.includes(item))
  const picked = [...preferred, ...rest].slice(0, count)

  const attemptId = nextAttemptId()
  const questions: QuizQuestionRecord[] = picked.map((item) => ({
    id: nextQuestionId(),
    attempt_id: attemptId,
    type: item.type,
    stem: item.stem,
    options: item.options ?? [],
    answer: item.answer,
    explanation: item.explanation,
    citations: [item.citation],
    point: item.point,
    user_answer: null,
    is_correct: null,
  }))
  quizStore.questions.push(...questions)

  const course = db.courses.find((item) => item.id === courseId)
  quizStore.attempts.unshift({
    id: attemptId,
    course_id: courseId,
    course_name: courseId === 0 ? '全部资料' : (course?.name ?? '未知课程'),
    total: questions.length,
    correct: 0,
    score: 0,
    duration_ms: 0,
    weak_points: [],
    created_at: nowIso(),
    submitted: false,
  })

  return ok({
    attempt_id: attemptId,
    total: questions.length,
    questions: questions.map(toClientQuestion),
  })
}

/** POST /quiz/attempts —— 提交作答，直接回结果（省掉一次 GET） */
const submitQuiz: HttpResponseResolver = async ({ request }) => {
  const parsed = QuizSubmitBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { attempt_id: attemptId, answers, duration_ms: durationMs } = parsed.data
  const attempt = quizStore.attempts.find((item) => item.id === attemptId)
  if (!attempt) return fail(ERROR_CODES.NOT_FOUND, '作答记录不存在')
  if (attempt.submitted) return fail(ERROR_CODES.CONFLICT, '该作答已提交，请重新生成题目')

  const questions = questionsOfAttempt(attemptId)
  let correct = 0

  for (const question of questions) {
    const answer = answers[String(question.id)]
    question.user_answer = answer ?? null
    question.is_correct = gradeAnswer(question, answer)
    if (question.is_correct) correct += 1
  }

  attempt.total = questions.length
  attempt.correct = correct
  attempt.score = questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100)
  attempt.duration_ms = durationMs
  attempt.submitted = true
  attempt.weak_points = [
    ...new Set(questions.filter((item) => item.is_correct !== true).map((item) => item.point)),
  ]

  // PAD §8：交卷成功写一条活动流
  pushActivity({
    type: 'QUIZ_SUBMITTED',
    target_id: String(attempt.id),
    target_type: 'QUIZ_ATTEMPT',
    title: `完成「${attempt.course_name}」练习，答对 ${attempt.correct} / ${attempt.total} 题（${attempt.score} 分）`,
  })

  return ok(toQuizResult(attempt, questions))
}

/** GET /quiz/attempts/{id} —— 结果（未提交不允许查看，避免提前拿到答案） */
const getQuizResult: HttpResponseResolver = ({ params }) => {
  const attempt = quizStore.attempts.find((item) => item.id === Number(params.id))
  if (!attempt) return fail(ERROR_CODES.NOT_FOUND, '作答记录不存在')
  if (!attempt.submitted) return fail(ERROR_CODES.INVALID_PARAM, '该作答尚未提交')

  return ok(toQuizResult(attempt, questionsOfAttempt(attempt.id)))
}

/** GET /quiz/attempts —— 历史作答记录（只列已提交的） */
const listQuizAttempts: HttpResponseResolver = ({ request }) => {
  const params = new URL(request.url).searchParams
  const page = readIntParam(params, 'page', 1)
  const size = readIntParam(params, 'size', 10)
  const courseId = readIntParam(params, 'course_id', 0)

  const list = quizStore.attempts
    .filter((item) => item.submitted)
    .filter((item) => courseId === 0 || item.course_id === courseId)
    .map((item) => ({
      id: item.id,
      course_id: item.course_id,
      course_name: item.course_name,
      total: item.total,
      correct: item.correct,
      score: item.score,
      duration_ms: item.duration_ms,
      created_at: item.created_at,
    }))

  return ok(paginate(list, page, size))
}

/** GET /quiz/weak-points —— 薄弱点排行（按掌握度升序，最多 20 条） */
const listWeakPoints: HttpResponseResolver = ({ request }) => {
  const courseId = readIntParam(new URL(request.url).searchParams, 'course_id', 0)

  const items = weakPointFixtures
    .filter((item) => courseId === 0 || item.course_id === courseId)
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map((item) => ({ point_name: item.point_name, score: item.score, weight: item.weight }))

  return ok({ items })
}

export const quizHandlers = [
  http.post(`${API}/quiz/generate`, generateQuiz),
  http.post(`${API}/quiz/attempts`, submitQuiz),
  http.get(`${API}/quiz/weak-points`, listWeakPoints),
  http.get(`${API}/quiz/attempts/:id`, getQuizResult),
  http.get(`${API}/quiz/attempts`, listQuizAttempts),
]
