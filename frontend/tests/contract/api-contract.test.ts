import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/mocks/db'
import { quizBankFixtures } from '@/mocks/fixtures/quiz'
import { handlers } from '@/mocks/handlers'
import {
  type MessageChunkData,
  MessageChunkDataSchema,
  MessageEndDataSchema,
  MessageStartDataSchema,
} from '@/schemas/chat'
import { ERROR_CODES } from '@/schemas/common'
import { FeedbackResponseSchema, MessageListResponseSchema } from '@/schemas/conversation'
import {
  CourseCodeCheckResponseSchema,
  CourseListResponseSchema,
  CourseSchema,
  SemesterListResponseSchema,
} from '@/schemas/course'
import {
  type ParseStatus,
  ParseStatusSchema,
  PresignResponseSchema,
  UploadResponseSchema,
} from '@/schemas/material'
import {
  QuizAttemptListResponseSchema,
  QuizGenerateResponseSchema,
  QuizResultSchema,
  WeakPointListResponseSchema,
} from '@/schemas/quiz'
import { ModelConfigSchema, ModelTestResultSchema } from '@/schemas/settings'

/**
 * 接口契约回归测试。
 * 作用：把 PAD 第七 / 九章的契约固化成断言，任何 mock（即契约）改动都会在这里暴露。
 * 说明：handlers 用相对路径注册（与浏览器保持一致），在 jsdom 下 MSW 会将其解析到
 * window.location.origin，因此测试统一以该 origin 拼接绝对 URL 发请求。
 */

const ORIGIN = window.location.origin
const API = `${ORIGIN}/api/v1`

const server = setupServer(...handlers)

interface Envelope<T> {
  code: number
  message: string
  data: T
  trace_id: string | null
}

async function callJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Envelope<T> }> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  return { status: response.status, body: (await response.json()) as Envelope<T> }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(() => {
  server.close()
})

describe('课程管理契约', () => {
  it('GET /courses 返回统一包装 + 分页结构，且字段可被 Zod 校验', async () => {
    const { status, body } = await callJson<unknown>('/courses?page=1&size=3')

    expect(status).toBe(200)
    expect(body.code).toBe(ERROR_CODES.OK)
    expect(typeof body.trace_id).toBe('string')

    const page = CourseListResponseSchema.parse(body.data)
    expect(page.list).toHaveLength(3)
    expect(page.page).toBe(1)
    expect(page.size).toBe(3)
    expect(page.total).toBeGreaterThanOrEqual(6)
  })

  it('GET /courses 支持 keyword / mine 过滤，且所有字段为 snake_case', async () => {
    const { body } = await callJson<unknown>('/courses?keyword=OS2026&mine=true')
    const page = CourseListResponseSchema.parse(body.data)

    expect(page.list).toHaveLength(1)
    const course = page.list[0]
    if (!course) throw new Error('未返回课程')
    expect(course.code).toBe('OS2026')
    expect(course.owner_id).toBe(1)

    // 契约守卫：不应出现 camelCase 字段
    expect(Object.keys(course)).not.toContain('materialCount')
    expect(Object.keys(course)).toContain('material_count')
  })

  it('POST /courses 课程编号重复时返回 1005 / 409', async () => {
    const { status, body } = await callJson<unknown>('/courses', {
      method: 'POST',
      body: JSON.stringify({ name: '重复编号课程', code: 'OS2026' }),
    })

    expect(status).toBe(409)
    expect(body.code).toBe(ERROR_CODES.CONFLICT)
  })

  it('POST /courses 参数非法时返回 1001', async () => {
    const { status, body } = await callJson<unknown>('/courses', {
      method: 'POST',
      body: JSON.stringify({ name: 'A', code: '不合法编号' }),
    })

    expect(status).toBe(400)
    expect(body.code).toBe(ERROR_CODES.INVALID_PARAM)
  })

  it('DELETE /courses/{id} 存在子资源时返回 1006，cascade=true 后成功删除', async () => {
    // 用公开接口造一个「有会话的课程」，避免依赖固定夹具
    const created = await callJson<unknown>('/courses', {
      method: 'POST',
      body: JSON.stringify({ name: '级联删除验证课', code: 'CASCADE-CHECK' }),
    })
    const course = CourseSchema.parse(created.body.data)

    await callJson<unknown>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ course_id: course.id }),
    })

    const blocked = await callJson<{ material_count: number; conversation_count: number }>(
      `/courses/${course.id}`,
      { method: 'DELETE' },
    )
    expect(blocked.status).toBe(409)
    expect(blocked.body.code).toBe(ERROR_CODES.HAS_CHILDREN)
    expect(blocked.body.data.conversation_count).toBe(1)

    const cascaded = await callJson<{ deleted: boolean }>(`/courses/${course.id}?cascade=true`, {
      method: 'DELETE',
    })
    expect(cascaded.status).toBe(200)
    expect(cascaded.body.data.deleted).toBe(true)

    const gone = await callJson<unknown>(`/courses/${course.id}`)
    expect(gone.body.code).toBe(ERROR_CODES.NOT_FOUND)
  })
})

describe('资料预签名上传契约', () => {
  async function presignOne(fileName: string, sizeBytes = 1024): Promise<Response> {
    const response = await fetch(`${API}/materials/presign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: 1,
        files: [
          {
            client_file_id: 'tmp_1',
            original_name: fileName,
            size_bytes: sizeBytes,
            content_type: 'application/pdf',
          },
        ],
      }),
    })
    return response
  }

  it('presign 拒绝超过 50MB 的文件（2001 / 413）', async () => {
    const response = await presignOne('超大讲义.pdf', 52_428_801)
    expect(response.status).toBe(413)
    expect(((await response.json()) as Envelope<null>).code).toBe(ERROR_CODES.FILE_TOO_LARGE)
  })

  it('presign 拒绝不支持的格式（2002 / 415）', async () => {
    const response = await presignOne('恶意脚本.exe')
    expect(response.status).toBe(415)
    expect(((await response.json()) as Envelope<null>).code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT)
  })

  it('三步走全链路：presign → 直传 → complete → 轮询至 READY', async () => {
    const presignResponse = await presignOne('契约验证资料.pdf')
    expect(presignResponse.status).toBe(200)

    const presigned = PresignResponseSchema.parse(
      ((await presignResponse.json()) as Envelope<unknown>).data,
    )
    expect(presigned.expires_in).toBe(900)
    expect(presigned.items).toHaveLength(1)

    const [item] = presigned.items
    if (!item) throw new Error('presign 未返回上传项')
    expect(item.method).toBe('PUT')

    // 第二步：按 upload_url + headers 直传（mock 下指向同源 /mock-minio/*）
    const uploaded = await fetch(`${ORIGIN}${item.upload_url}`, {
      method: item.method,
      headers: item.headers,
      body: new Blob(['pdf-bytes']),
    })
    expect(uploaded.status).toBe(200)
    expect(uploaded.headers.get('ETag')).toBeTruthy()

    // 第三步：complete
    const completed = await callJson<unknown>('/materials/complete', {
      method: 'POST',
      body: JSON.stringify({
        upload_batch_id: presigned.upload_batch_id,
        items: [
          {
            client_file_id: item.client_file_id,
            material_id: item.material_id,
            etag: uploaded.headers.get('ETag') ?? undefined,
          },
        ],
      }),
    })
    const queued = UploadResponseSchema.parse(completed.body.data)
    expect(queued.material_ids).toEqual([item.material_id])
    expect(queued.status).toBe('QUEUED')

    // 前端会轮询该接口展示行内进度
    let latest: ParseStatus | null = null
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const polled = await callJson<unknown>(`/materials/${item.material_id}/parse-status`)
      latest = ParseStatusSchema.parse(polled.body.data)
      if (latest.status === 'SUCCESS') break
    }

    expect(latest).not.toBeNull()
    expect(latest?.status).toBe('SUCCESS')
    expect(latest?.progress).toBe(100)
    expect(latest?.indexed_chunks).toBe(latest?.total_chunks)
  })
})

describe('SSE 流式问答契约（PAD §7.9）', () => {
  interface Frame {
    event: string
    data: unknown
  }

  function parseFrames(raw: string): Frame[] {
    return raw
      .split(/\r?\n\r?\n/)
      .filter((chunk) => chunk.trim() !== '')
      .map((chunk) => {
        let event = ''
        const dataLines: string[] = []
        for (const line of chunk.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
        }
        return { event, data: JSON.parse(dataLines.join('\n')) as unknown }
      })
  }

  async function stream(
    question: string,
  ): Promise<{ status: number; contentType: string; frames: Frame[] }> {
    const response = await fetch(`${API}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ course_id: 1, question, history_limit: 6 }),
    })

    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      return { status: response.status, contentType: 'application/json', frames: [] }
    }

    return {
      status: response.status,
      contentType: 'text/event-stream',
      frames: parseFrames(await response.text()),
    }
  }

  it('事件顺序为 start → chunk* → citation → end，且每帧可被 Zod 校验', async () => {
    const { status, contentType, frames } = await stream('什么是分页机制？')

    expect(status).toBe(200)
    expect(contentType).toBe('text/event-stream')
    expect(frames.length).toBeGreaterThan(4)

    expect(frames[0]?.event).toBe('message_start')
    expect(frames.at(-1)?.event).toBe('message_end')

    const start = MessageStartDataSchema.parse(frames[0]?.data)
    expect(start.conversation_id).not.toBe('')
    expect(start.message_id).toBe(start.message_id)

    const chunks: MessageChunkData[] = frames
      .filter((frame) => frame.event === 'message_chunk')
      .map((frame) => MessageChunkDataSchema.parse(frame.data))
    expect(chunks.length).toBeGreaterThan(3)
    expect(chunks.every((chunk) => chunk.message_id === start.message_id)).toBe(true)

    // 所有 chunk 拼接后应包含正文关键词，证明打字机分片没有丢字
    expect(chunks.map((chunk) => chunk.delta).join('')).toContain('页表')

    const citations = frames.filter((frame) => frame.event === 'citation')
    expect(citations.length).toBeGreaterThan(0)

    const end = MessageEndDataSchema.parse(frames.at(-1)?.data)
    expect(end.finish_reason).toBe('stop')
    expect(end.tokens).toBeGreaterThan(0)
  })

  it('AI 服务不可用时返回 3001 / 503，而不是流中报错', async () => {
    const { status, contentType } = await stream('__unavailable__ 模拟降级')

    expect(status).toBe(503)
    expect(contentType).toBe('application/json')
  })

  it('流中异常下发 error 事件，并以下发顺序保证 error 早于 message_end', async () => {
    const { frames } = await stream('__stream_error__ 模拟流中异常')

    const errorIndex = frames.findIndex((frame) => frame.event === 'error')
    const endIndex = frames.findIndex((frame) => frame.event === 'message_end')

    expect(errorIndex).toBeGreaterThan(-1)
    expect(endIndex).toBeGreaterThan(errorIndex)
    expect(MessageEndDataSchema.parse(frames[endIndex]?.data).finish_reason).toBe('error')
  })
})

describe('学期字典契约（v0.3 新增）', () => {
  it('GET /courses/semesters 返回学期与课程数，按学期倒序且秋在春前', async () => {
    const { status, body } = await callJson<unknown>('/courses/semesters')

    expect(status).toBe(200)
    expect(body.code).toBe(ERROR_CODES.OK)

    const parsed = SemesterListResponseSchema.parse(body.data)
    expect(parsed.items.length).toBeGreaterThan(0)

    // 字面量路由不能被 /courses/:id 吃掉（否则会返回 1004）
    expect(parsed.items.map((item) => item.value)).toEqual(['2026秋', '2025春'])
    expect(parsed.items.every((item) => item.course_count > 0)).toBe(true)
  })
})

describe('课程编号预检契约（v0.4 新增）', () => {
  it('编号被占用时 available=false 并回传冲突课程（大小写不敏感）', async () => {
    const { status, body } = await callJson<unknown>('/courses/check-code?code=os2026')

    expect(status).toBe(200)
    const parsed = CourseCodeCheckResponseSchema.parse(body.data)
    expect(parsed.available).toBe(false)
    expect(parsed.conflict_course_id).toBe(1)
    expect(parsed.conflict_course_name).toBe('操作系统')
  })

  it('编辑态通过 exclude_id 排除自身，编号应判定为可用', async () => {
    const { body } = await callJson<unknown>('/courses/check-code?code=OS2026&exclude_id=1')
    expect(CourseCodeCheckResponseSchema.parse(body.data).available).toBe(true)
  })

  it('全新编号判定为可用，且不带冲突信息', async () => {
    const { body } = await callJson<unknown>('/courses/check-code?code=BRAND-NEW-2026')
    const parsed = CourseCodeCheckResponseSchema.parse(body.data)
    expect(parsed.available).toBe(true)
    expect(parsed.conflict_course_id ?? null).toBeNull()
  })
})

describe('问答反馈契约（v0.6 新增）', () => {
  // 消息 id 规则见 mocks/handlers/conversation.buildMockMessages：会话 1 的助手回答为 "102"
  const assistantMessageId = '102'
  const userMessageId = '101'

  async function putFeedback(
    messageId: string,
    rating: unknown,
  ): Promise<{ status: number; body: Envelope<unknown> }> {
    return callJson<unknown>(`/messages/${messageId}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    })
  }

  it('幂等替换 UP→DOWN，并回显到消息列表；rating=null 取消', async () => {
    const up = await putFeedback(assistantMessageId, 'UP')
    expect(up.status).toBe(200)
    expect(FeedbackResponseSchema.parse(up.body.data)).toEqual({
      message_id: assistantMessageId,
      feedback: 'UP',
    })

    const down = await putFeedback(assistantMessageId, 'DOWN')
    expect(down.status).toBe(200)
    expect(FeedbackResponseSchema.parse(down.body.data).feedback).toBe('DOWN')

    // 落库后 GET 消息列表必须回显，否则前端刷新会丢态
    const listed = await callJson<unknown>('/conversations/1/messages?page=1&size=50')
    const messages = MessageListResponseSchema.parse(listed.body.data)
    expect(messages.list.find((item) => item.id === assistantMessageId)?.feedback).toBe('DOWN')

    const cleared = await putFeedback(assistantMessageId, null)
    expect(FeedbackResponseSchema.parse(cleared.body.data).feedback).toBeNull()
  })

  it('仅助手回答可反馈：用户消息返回 1001，消息不存在返回 1004', async () => {
    const onUserMessage = await putFeedback(userMessageId, 'UP')
    expect(onUserMessage.status).toBe(400)
    expect(onUserMessage.body.code).toBe(ERROR_CODES.INVALID_PARAM)

    const missing = await putFeedback('999999', 'UP')
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe(ERROR_CODES.NOT_FOUND)
  })

  it('rating 非法时返回 1001', async () => {
    const bad = await putFeedback(assistantMessageId, 'MAYBE')
    expect(bad.status).toBe(400)
    expect(bad.body.code).toBe(ERROR_CODES.INVALID_PARAM)
  })
})

describe('大模型配置契约（v0.7 新增，BYOK）', () => {
  const DEEPSEEK_BODY = {
    provider: 'DEEPSEEK',
    base_url: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  }

  it('GET /settings/model 只回显掩码，响应体不含明文密钥', async () => {
    const { status, body } = await callJson<unknown>('/settings/model')
    expect(status).toBe(200)

    const config = ModelConfigSchema.parse(body.data)
    expect(config.has_api_key).toBe(true)
    expect(config.api_key_masked).toContain('****')

    // 契约守卫：响应字段里不允许出现明文 api_key
    expect(Object.keys(config)).not.toContain('api_key')
    expect(JSON.stringify(body.data)).not.toContain('sk-mock')
  })

  it('PUT /settings/model 省略 api_key 时保留原密钥，传新值时覆盖', async () => {
    const before = ModelConfigSchema.parse((await callJson<unknown>('/settings/model')).body.data)

    const kept = await callJson<unknown>('/settings/model', {
      method: 'PUT',
      body: JSON.stringify({ ...DEEPSEEK_BODY, provider: 'QWEN', model: 'qwen-plus' }),
    })
    expect(kept.status).toBe(200)
    const afterKept = ModelConfigSchema.parse(kept.body.data)
    expect(afterKept.provider).toBe('QWEN')
    expect(afterKept.model).toBe('qwen-plus')
    expect(afterKept.api_key_masked).toBe(before.api_key_masked)

    const replaced = await callJson<unknown>('/settings/model', {
      method: 'PUT',
      body: JSON.stringify({ ...DEEPSEEK_BODY, api_key: 'sk-branch-abcdef123456' }),
    })
    expect(ModelConfigSchema.parse(replaced.body.data).api_key_masked).toBe('sk-****3456')
  })

  it('PUT /settings/model 参数非法时返回 1001', async () => {
    const bad = await callJson<unknown>('/settings/model', {
      method: 'PUT',
      body: JSON.stringify({ provider: 'DEEPSEEK', base_url: '不是地址', model: '' }),
    })
    expect(bad.status).toBe(400)
    expect(bad.body.code).toBe(ERROR_CODES.INVALID_PARAM)
  })

  it('POST /settings/model/test 成功返回耗时，密钥无效时返回 ok=false 而不报错', async () => {
    const succeeded = await callJson<unknown>('/settings/model/test', {
      method: 'POST',
      body: JSON.stringify(DEEPSEEK_BODY),
    })
    expect(succeeded.status).toBe(200)
    const parsed = ModelTestResultSchema.parse(succeeded.body.data)
    expect(parsed.ok).toBe(true)
    expect(parsed.latency_ms).toBeGreaterThan(0)
    expect(parsed.message).toContain('deepseek-chat')

    const failed = await callJson<unknown>('/settings/model/test', {
      method: 'POST',
      body: JSON.stringify({ ...DEEPSEEK_BODY, api_key: 'sk-invalid-000000' }),
    })
    expect(failed.status).toBe(200)
    expect(ModelTestResultSchema.parse(failed.body.data).ok).toBe(false)
  })

  it('大模型未配置时 /ai/chat/stream 直接返回 3004，不下发流式响应', async () => {
    const saved = { ...db.modelConfig }
    db.modelConfig = { ...saved, api_key: '' }
    try {
      const response = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ course_id: 1, question: '什么是分页机制？', history_limit: 6 }),
      })

      expect(response.status).toBe(503)
      expect(response.headers.get('content-type')).not.toContain('text/event-stream')

      const body = (await response.json()) as Envelope<null>
      expect(body.code).toBe(ERROR_CODES.MODEL_NOT_CONFIGURED)
      expect(body.message).toContain('尚未配置大模型')
    } finally {
      db.modelConfig = saved
    }
  })
})

describe('智能出题契约（v0.10 新增）', () => {
  it('POST /quiz/generate 返回 attempt_id，且下发题目不含答案与解析', async () => {
    const { status, body } = await callJson<unknown>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ course_id: 1, count: 3, types: ['SINGLE'], difficulty: 'EASY' }),
    })
    expect(status).toBe(200)

    const quiz = QuizGenerateResponseSchema.parse(body.data)
    expect(quiz.attempt_id).toBeGreaterThan(0)
    expect(quiz.questions.length).toBeGreaterThan(0)
    expect(quiz.total).toBe(quiz.questions.length)

    // 契约守卫：题目里绝不能出现 answer / explanation
    const first = quiz.questions[0]
    if (first === undefined) throw new Error('未返回题目')
    expect(Object.keys(first)).not.toContain('answer')
    expect(Object.keys(first)).not.toContain('explanation')
    expect(JSON.stringify(body.data)).not.toContain('explanation')
  })

  it('提交作答按选项文本判分：答对计分、未作答计错，并回传解析与薄弱点', async () => {
    const generated = await callJson<unknown>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({
        course_id: 1,
        count: 2,
        types: ['SINGLE', 'FILL'],
        difficulty: 'MEDIUM',
      }),
    })
    const quiz = QuizGenerateResponseSchema.parse(generated.body.data)
    const [answeredQuestion, skippedQuestion] = quiz.questions
    if (answeredQuestion === undefined || skippedQuestion === undefined) {
      throw new Error('题量不足，无法覆盖「答对 + 未作答」两种情形')
    }

    // 从题库里取出学生端看不到的正解，验证判分确实生效
    const bankItem = quizBankFixtures.find((item) => item.stem === answeredQuestion.stem)
    const rightAnswer = bankItem?.answer
    if (typeof rightAnswer !== 'string') throw new Error('题库未提供单选正解')

    const submitted = await callJson<unknown>('/quiz/attempts', {
      method: 'POST',
      body: JSON.stringify({
        attempt_id: quiz.attempt_id,
        answers: { [String(answeredQuestion.id)]: rightAnswer },
        duration_ms: 65_000,
      }),
    })
    expect(submitted.status).toBe(200)

    const result = QuizResultSchema.parse(submitted.body.data)
    expect(result.total).toBe(2)
    expect(result.duration_ms).toBe(65_000)
    expect(result.details).toHaveLength(2)

    const answeredDetail = result.details[0]
    expect(answeredDetail?.correct).toBe(true)
    expect(answeredDetail?.user_answer).toBe(rightAnswer)
    // v0.10 补齐：结果明细必须能复现题干与选项，否则结果页渲染不出来
    expect(answeredDetail?.stem).toBe(answeredQuestion.stem)
    expect(answeredDetail?.options).toEqual(answeredQuestion.options)
    expect(answeredDetail?.explanation).not.toBe('')

    const skippedDetail = result.details[1]
    expect(skippedDetail?.user_answer).toBeNull()
    expect(skippedDetail?.correct).toBe(false)

    expect(result.correct).toBe(1)
    expect(result.score).toBe(50)
    expect(result.weak_points_generated.length).toBeGreaterThan(0)

    // 结果接口与提交返回一致；历史列表能看到该次作答
    const fetched = await callJson<unknown>(`/quiz/attempts/${quiz.attempt_id}`)
    expect(QuizResultSchema.parse(fetched.body.data).score).toBe(result.score)

    const listed = await callJson<unknown>('/quiz/attempts?page=1&size=10')
    const page = QuizAttemptListResponseSchema.parse(listed.body.data)
    expect(page.list.some((item) => item.id === quiz.attempt_id)).toBe(true)

    // 同一份作答不允许重复提交
    const again = await callJson<unknown>('/quiz/attempts', {
      method: 'POST',
      body: JSON.stringify({ attempt_id: quiz.attempt_id, answers: {}, duration_ms: 1000 }),
    })
    expect(again.status).toBe(409)
    expect(again.body.code).toBe(ERROR_CODES.CONFLICT)
  })

  it('GET /quiz/weak-points 按掌握度升序返回，且按 course_id 过滤', async () => {
    const { status, body } = await callJson<unknown>('/quiz/weak-points?course_id=1')
    expect(status).toBe(200)

    const parsed = WeakPointListResponseSchema.parse(body.data)
    expect(parsed.items.length).toBeGreaterThan(0)

    const scores = parsed.items.map((item) => item.score)
    expect([...scores].sort((a, b) => a - b)).toEqual(scores)
    expect(parsed.items[0]?.point_name).toBe('虚拟内存与置换')
  })

  it('出题条件无匹配时返回 1001，未提交的作答不允许查看结果', async () => {
    const noMatch = await callJson<unknown>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ course_id: 1, count: 3, types: ['ESSAY'], difficulty: 'EASY' }),
    })
    expect(noMatch.status).toBe(400)
    expect(noMatch.body.code).toBe(ERROR_CODES.INVALID_PARAM)

    const generated = await callJson<unknown>('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ course_id: 1, count: 1, types: ['SINGLE'], difficulty: 'EASY' }),
    })
    const quiz = QuizGenerateResponseSchema.parse(generated.body.data)

    const notSubmitted = await callJson<unknown>(`/quiz/attempts/${quiz.attempt_id}`)
    expect(notSubmitted.status).toBe(400)
    expect(notSubmitted.body.code).toBe(ERROR_CODES.INVALID_PARAM)
  })
})
