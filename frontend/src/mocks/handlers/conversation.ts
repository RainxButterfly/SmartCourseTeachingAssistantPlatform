import { type HttpResponseResolver, http } from 'msw'

import { env } from '@/lib/env'
import { db, nextSequence, nowIso } from '@/mocks/db'
import { conversationFixtures } from '@/mocks/fixtures/conversations'
import { fail, ok, paginate, readIntParam } from '@/mocks/utils/response'
import { ERROR_CODES } from '@/schemas/common'
import {
  CONVERSATION_DEFAULT_TITLE,
  type Conversation,
  CreateConversationBodySchema,
  FeedbackBodySchema,
  type Message,
  RenameConversationBodySchema,
} from '@/schemas/conversation'

const API = env.apiBaseUrl

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function courseNameOf(courseId: number): string {
  if (courseId === 0) return '全部资料'
  return db.courses.find((item) => item.id === courseId)?.name ?? '未知课程'
}

function findConversation(id: string): Conversation | undefined {
  return db.conversations.find((item) => item.id === id)
}

/** GET /conversations —— 按课程筛选 + 标题搜索 + 最近排序 */
const listConversations: HttpResponseResolver = ({ request }) => {
  const params = new URL(request.url).searchParams
  const page = readIntParam(params, 'page', 1)
  const size = readIntParam(params, 'size', 20)
  const keyword = (params.get('keyword') ?? '').trim().toLowerCase()
  const courseIdRaw = params.get('course_id')

  let list = db.conversations.slice()
  if (courseIdRaw !== null && courseIdRaw !== '') {
    list = list.filter((item) => item.course_id === Number(courseIdRaw))
  }
  if (keyword !== '') {
    list = list.filter((item) => item.title.toLowerCase().includes(keyword))
  }
  list.sort((a, b) =>
    (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at),
  )

  return ok(paginate(list, page, size))
}

/** POST /conversations —— 新建；title 为空时由后端给默认值 */
const createConversation: HttpResponseResolver = async ({ request }) => {
  const parsed = CreateConversationBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const { course_id: courseId, title } = parsed.data
  if (courseId !== 0 && !db.courses.some((item) => item.id === courseId)) {
    return fail(ERROR_CODES.NOT_FOUND, '课程不存在')
  }

  const conversation: Conversation = {
    id: String(nextSequence('conversation')),
    title: title ?? CONVERSATION_DEFAULT_TITLE,
    course_id: courseId,
    course_name: courseNameOf(courseId),
    message_count: 0,
    last_message_at: null,
    created_at: nowIso(),
  }

  db.conversations.unshift(conversation)
  if (courseId !== 0) {
    const course = db.courses.find((item) => item.id === courseId)
    if (course) {
      course.conversation_count += 1
      course.last_active_at = conversation.created_at
    }
  }

  return ok(conversation)
}

const getConversation: HttpResponseResolver = ({ params }) => {
  const conversation = findConversation(String(params.id))
  if (!conversation) return fail(ERROR_CODES.NOT_FOUND, '会话不存在')
  return ok(conversation)
}

/** PUT /conversations/{id} —— 仅重命名 */
const renameConversation: HttpResponseResolver = async ({ params, request }) => {
  const conversation = findConversation(String(params.id))
  if (!conversation) return fail(ERROR_CODES.NOT_FOUND, '会话不存在')

  const parsed = RenameConversationBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  conversation.title = parsed.data.title
  return ok(conversation)
}

const deleteConversation: HttpResponseResolver = ({ params }) => {
  const id = String(params.id)
  if (!findConversation(id)) return fail(ERROR_CODES.NOT_FOUND, '会话不存在')

  db.conversations = db.conversations.filter((item) => item.id !== id)
  return ok({ id, deleted: true })
}

/** 夹具会话才有演示消息；用户新建的会话只应有真实落库的消息 */
const FIXTURE_CONVERSATION_IDS = new Set(conversationFixtures.map((item) => item.id))

/** 为 mock 夹具会话合成一组消息，让消息流有内容可渲染 */
export function buildMockMessages(conversation: Conversation): Message[] {
  if (!FIXTURE_CONVERSATION_IDS.has(conversation.id)) return []

  const assistantMessageId = assistantMessageIdOf(conversation.id)
  const primaryMaterial =
    db.materials.find(
      (item) => item.course_id === conversation.course_id && item.status === 'READY',
    ) ?? db.materials[0]

  const citation = primaryMaterial
    ? [
        {
          index: 1,
          material_id: primaryMaterial.id,
          title: primaryMaterial.name,
          page: 12,
          snippet:
            '分页机制将进程的逻辑地址空间切分成若干固定大小的页，通过页表建立页到物理帧的映射。',
          score: 0.83,
        },
      ]
    : []

  return [
    {
      id: `${conversation.id}01`,
      conversation_id: conversation.id,
      role: 'USER',
      content: '这门课的重点是什么？',
      tokens: 12,
      citations: [],
      feedback: null,
      created_at: conversation.created_at,
    },
    {
      id: assistantMessageId,
      conversation_id: conversation.id,
      role: 'ASSISTANT',
      content:
        '依据当前课程资料，重点集中在三块：内存管理（分页与虚拟内存）、进程与线程调度、文件系统与并发控制。建议先建立地址翻译的整体链路认知，再深入页表与缺页处理细节。',
      tokens: 186,
      citations: citation,
      feedback: db.feedbackByMessage[assistantMessageId] ?? null,
      created_at: conversation.last_message_at ?? conversation.created_at,
    },
  ]
}

/** 消息 id 合成规则：`${conversation_id}01` 为用户提问，`02` 为助手回答 */
function assistantMessageIdOf(conversationId: string): string {
  return `${conversationId}02`
}

/** 跨会话按 id 定位消息：先查流式落库的消息，再回退到夹具合成消息 */
function findMessage(messageId: string): Message | undefined {
  const persisted = db.messages.find((item) => item.id === messageId)
  if (persisted) return persisted

  for (const conversation of db.conversations) {
    const found = buildMockMessages(conversation).find((item) => item.id === messageId)
    if (found) return found
  }
  return undefined
}

/** GET /conversations/{id}/messages —— 消息分页（倒序取最近 N 条） */
const listMessages: HttpResponseResolver = ({ params, request }) => {
  const conversation = findConversation(String(params.id))
  if (!conversation) return fail(ERROR_CODES.NOT_FOUND, '会话不存在')

  const page = readIntParam(new URL(request.url).searchParams, 'page', 1)
  const size = readIntParam(new URL(request.url).searchParams, 'size', 50)

  const history = [
    ...buildMockMessages(conversation),
    ...db.messages.filter((item) => item.conversation_id === conversation.id),
  ]
  return ok(paginate(history, page, size))
}

/** PUT /messages/{id}/feedback —— 幂等替换反馈；rating=null 取消（PAD §7.4 / §9.5 v0.6） */
const putMessageFeedback: HttpResponseResolver = async ({ params, request }) => {
  const parsed = FeedbackBodySchema.safeParse(await readJson(request))
  if (!parsed.success) {
    return fail(ERROR_CODES.INVALID_PARAM, parsed.error.issues[0]?.message ?? '请求参数无效')
  }

  const messageId = String(params.id)
  const message = findMessage(messageId)
  if (!message) return fail(ERROR_CODES.NOT_FOUND, '消息不存在')
  if (message.role !== 'ASSISTANT') {
    return fail(ERROR_CODES.INVALID_PARAM, '仅可对助手回答反馈')
  }

  const { rating } = parsed.data
  if (rating === null) delete db.feedbackByMessage[messageId]
  else db.feedbackByMessage[messageId] = rating

  return ok({ message_id: messageId, feedback: rating })
}

export const conversationHandlers = [
  http.get(`${API}/conversations`, listConversations),
  http.post(`${API}/conversations`, createConversation),
  http.get(`${API}/conversations/:id`, getConversation),
  http.put(`${API}/conversations/:id`, renameConversation),
  http.delete(`${API}/conversations/:id`, deleteConversation),
  http.get(`${API}/conversations/:id/messages`, listMessages),
  http.put(`${API}/messages/:id/feedback`, putMessageFeedback),
]
