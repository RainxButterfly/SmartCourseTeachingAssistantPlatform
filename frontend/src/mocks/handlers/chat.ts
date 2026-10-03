import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { pushActivity } from '@/mocks/activity'
import { db, nextSequence, nowIso } from '@/mocks/db'
import { fail, ok, readIntParam } from '@/mocks/utils/response'
import {
  createSseResponse,
  type SseEventPayload,
  splitIntoDeltas,
} from '@/mocks/utils/sse-response'
import { ChatRequestBodySchema } from '@/schemas/chat'
import { ERROR_CODES } from '@/schemas/common'
import {
  type Citation,
  CONVERSATION_DEFAULT_TITLE,
  type Conversation,
} from '@/schemas/conversation'

const API = env.apiBaseUrl

const DEFAULT_ANSWER =
  '依据当前课程资料，重点集中在三块：内存管理（分页与虚拟内存）、进程与线程调度、文件系统与并发控制。建议先建立地址翻译的整体链路认知，再深入页表与缺页处理细节。若需要针对某一章展开，可以直接指定章节名。'

const CANNED_ANSWERS: Array<{ pattern: RegExp; answer: string }> = [
  {
    pattern: /分页|页表|虚拟内存/,
    answer:
      '分页机制把进程的逻辑地址空间切成固定大小的页，再由页表把页映射到物理帧，从而消除外部碎片。虚拟内存在此基础上允许只把活跃页驻留内存，其余留在磁盘，缺页时由缺页中断按需调入。地址翻译链路是：逻辑地址 → 页号 + 页内偏移 → 查页表（TLB 命中直接返回）→ 物理帧号 + 偏移 → 物理地址。',
  },
  {
    pattern: /红黑树|旋转|平衡树/,
    answer:
      '红黑树通过五条性质把树高约束在 O(log n)：节点非红即黑、根为黑、红节点子节点必为黑、任一节点到叶子的黑高相同。插入后若出现连续红节点，先看叔叔节点颜色：叔叔为红则变色上推，叔叔为黑或不存在则做一次或两次旋转，旋转后重新着色即可恢复性质。',
  },
  {
    pattern: /tcp|拥塞|可靠传输/i,
    answer:
      'TCP 的可靠传输建立在序号、确认号与重传之上：超时重传配合快速重传覆盖丢包，滑动窗口实现流量控制，拥塞窗口则用慢启动、拥塞避免、快速恢复三阶段调节发送速率，避免把网络推到崩溃点。',
  },
]

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function deriveTitle(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, ' ')
  return trimmed.length > 20 ? `${trimmed.slice(0, 20)}…` : trimmed || CONVERSATION_DEFAULT_TITLE
}

function courseNameOf(courseId: number): string {
  if (courseId === 0) return '全部资料'
  return db.courses.find((item) => item.id === courseId)?.name ?? '未知课程'
}

function pickAnswer(question: string): string {
  return CANNED_ANSWERS.find((item) => item.pattern.test(question))?.answer ?? DEFAULT_ANSWER
}

/** 依据检索范围挑出引用来源（真实实现由 Milvus 召回 + RRF + Reranker 产出） */
function pickCitations(courseId: number): Citation[] {
  const scoped =
    courseId === 0 ? db.materials : db.materials.filter((item) => item.course_id === courseId)

  return scoped
    .filter((item) => item.status === 'READY')
    .slice(0, 2)
    .map((item, index) => ({
      index: index + 1,
      material_id: item.id,
      title: item.name,
      page: 12 + index * 7,
      snippet:
        index === 0
          ? '分页机制将进程的逻辑地址空间切分成若干固定大小的页，通过页表建立页到物理帧的映射，从而消除外部碎片。'
          : '虚拟内存允许只把活跃页驻留物理内存，缺页中断触发按需调入，配合置换算法控制内存占用。',
      score: Number((0.86 - index * 0.07).toFixed(2)),
    }))
}

function resolveConversation(
  conversationId: string | undefined,
  courseId: number,
  question: string,
): Conversation | null {
  if (conversationId !== undefined && conversationId !== '') {
    const existing = db.conversations.find((item) => item.id === conversationId)
    if (!existing) return null
    return existing
  }

  const created: Conversation = {
    id: String(nextSequence('conversation')),
    title: deriveTitle(question),
    course_id: courseId,
    course_name: courseNameOf(courseId),
    message_count: 0,
    last_message_at: null,
    created_at: nowIso(),
  }
  db.conversations.unshift(created)
  return created
}

/** POST /ai/chat/stream —— 严格按 PAD §7.9 下发 SSE 事件 */
const chatStream: HttpResponseResolver = async ({ request }) => {
  const parsed = ChatRequestBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { conversation_id: conversationId, course_id: courseId, question } = parsed.data

  // 未配置大模型：直接拒绝，不进入检索与模型调用（PAD §7.5 / §10.2 v0.8）
  if (db.modelConfig.api_key === '') {
    return fail(ERROR_CODES.MODEL_NOT_CONFIGURED)
  }

  // 调试开关：__unavailable__ 触发 3001 降级，__stream_error__ 触发流中 error 事件
  if (question.includes('__unavailable__')) {
    return fail(ERROR_CODES.AI_SERVICE_UNAVAILABLE)
  }

  const scopedMaterials =
    courseId === 0 ? db.materials : db.materials.filter((item) => item.course_id === courseId)
  if (scopedMaterials.length > 0 && !scopedMaterials.some((item) => item.status === 'READY')) {
    return fail(ERROR_CODES.MATERIAL_NOT_READY, '该课程的资料尚未解析完成，请稍后再试')
  }

  const conversation = resolveConversation(conversationId, courseId, question)
  if (!conversation) return fail(ERROR_CODES.NOT_FOUND, '会话不存在')

  // PAD §8：会话「首次」提问写一条活动流（message_count 仍为 0 即首次），避免每问一条刷屏
  if (conversation.message_count === 0) {
    pushActivity({
      type: 'CHAT_ASKED',
      target_id: conversation.id,
      target_type: 'CONVERSATION',
      title: `在「${conversation.title}」中提问：${question.length > 40 ? `${question.slice(0, 40)}…` : question}`,
    })
  }

  const messageId = String(Date.now())
  const answer = pickAnswer(question)
  const citations = pickCitations(courseId)
  const deltas = splitIntoDeltas(answer, 6)
  const createdAt = nowIso()

  const events: SseEventPayload[] = [
    {
      event: 'message_start',
      data: { message_id: messageId, conversation_id: conversation.id, created_at: createdAt },
    },
  ]

  deltas.forEach((delta, index) => {
    events.push({ event: 'message_chunk', data: { message_id: messageId, delta } })

    // 引用在生成过程的中段下发，模拟真实链路里 rerank 完成即推送
    if (index === 2 || index === 6) {
      const citation = citations[index === 2 ? 0 : 1]
      if (citation) {
        events.push({ event: 'citation', data: { message_id: messageId, ...citation } })
      }
    }

    if (question.includes('__stream_error__') && index === 4) {
      events.push({
        event: 'error',
        data: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: 'AI 服务暂不可用，请稍后重试',
          message_id: messageId,
        },
      })
    }
  })

  events.push({
    event: 'message_end',
    data: {
      message_id: messageId,
      finish_reason: question.includes('__stream_error__') ? 'error' : 'stop',
      tokens: Math.round(answer.length / 2),
      elapsed_ms: deltas.length * 24,
    },
  })

  // 落库本轮问答：点赞/点踩按消息 id 定位、/chat 页消息历史都依赖它（PAD §10.2）
  db.messages.push(
    {
      id: `${messageId}u`,
      conversation_id: conversation.id,
      role: 'USER',
      content: question,
      tokens: Math.round(question.length / 2),
      citations: [],
      feedback: null,
      created_at: createdAt,
    },
    {
      id: messageId,
      conversation_id: conversation.id,
      role: 'ASSISTANT',
      content: answer,
      tokens: Math.round(answer.length / 2),
      citations,
      feedback: null,
      created_at: createdAt,
    },
  )

  if (conversation.title === CONVERSATION_DEFAULT_TITLE) {
    conversation.title = deriveTitle(question)
  }
  conversation.message_count += 2
  conversation.last_message_at = createdAt

  return createSseResponse(events, { chunkIntervalMs: 24, signal: request.signal })
}

/** POST /ai/chat/abort —— 前端本地 abort 后通知后端释放算力 */
const chatAbort: HttpResponseResolver = async ({ request }) => {
  const body = (await readJson(request)) as { conversation_id?: unknown } | null
  if (typeof body?.conversation_id !== 'string' || body.conversation_id === '') {
    return fail(ERROR_CODES.INVALID_PARAM, 'conversation_id 必填')
  }
  return ok({ aborted: true })
}

const SUGGESTIONS_BY_COURSE: Record<number, string[]> = {
  0: [
    '帮我梳理这门课的整体知识框架',
    '我最近错得最多的知识点是什么',
    '用三句话解释 RAG 的检索流程',
  ],
  1: ['这门课的重点是什么？', '分页与分段的区别是什么？', '帮我出 5 道内存管理练习题'],
  2: ['红黑树插入后为什么需要旋转？', '动态规划与贪心的适用边界', '帮我出 5 道图论练习题'],
}

/** GET /ai/suggestions —— 推荐问题 */
const chatSuggestions: HttpResponseResolver = ({ request }) => {
  const courseId = readIntParam(new URL(request.url).searchParams, 'course_id', 0)
  const items = SUGGESTIONS_BY_COURSE[courseId] ?? SUGGESTIONS_BY_COURSE[0] ?? []
  return ok({ items })
}

export const chatHandlers = [
  http.post(`${API}/ai/chat/stream`, chatStream),
  http.post(`${API}/ai/chat/abort`, chatAbort),
  http.get(`${API}/ai/suggestions`, chatSuggestions),
]
