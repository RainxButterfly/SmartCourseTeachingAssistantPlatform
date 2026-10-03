import { afterEach, describe, expect, it, vi } from 'vitest'

import { configureHttpAuth } from '@/lib/http'
import { streamChat } from '@/lib/sse'

/**
 * SSE 通道的 401 恢复（PAD §7.1）。
 *
 * 流式问答走裸 fetch，无法经过 axios 的响应拦截器，因此必须显式对齐
 * 「401 → 刷新一次 → 重放原请求；刷新失败或重放仍 401 则清会话」这套全局约定。
 * 否则 access_token 过期（2h）后提问会直接报登录失效，而不是静默续期。
 */

const BODY = { course_id: 1, question: '什么是分页机制？', history_limit: 6 }

/** 失败响应体：与后端统一 envelope 一致 */
function envelope(code: number, message: string): string {
  return JSON.stringify({ code, message, data: null, trace_id: null })
}

/** 一段最小的合法事件流 */
function streamOk(): Response {
  return new Response(
    'event: message_end\ndata: {"message_id":"1","finish_reason":"stop","tokens":3,"elapsed_ms":10}\n\n',
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  )
}

/** 取出本次请求实际带上的 Authorization 头（streamChat 传的是普通对象） */
function readAuth(init?: RequestInit): string | undefined {
  const headers = init?.headers
  if (headers === undefined || headers instanceof Headers || Array.isArray(headers))
    return undefined
  return headers.Authorization
}

interface Harness {
  auths: Array<string | undefined>
  fetchCount: () => number
}

/** 用桩替换全局 fetch，按第几次调用返回不同响应 */
function stubFetch(responder: (call: number) => Response): Harness {
  const auths: Array<string | undefined> = []
  const mock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    auths.push(readAuth(init))
    return responder(auths.length)
  })
  vi.stubGlobal('fetch', mock)
  return { auths, fetchCount: () => mock.mock.calls.length }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamChat · 401 恢复（与 axios 拦截器行为对齐）', () => {
  it('401 时刷新一次并带新 token 重放，事件流正常结束', async () => {
    let refreshCalls = 0
    let unauthorizedCalls = 0
    configureHttpAuth({
      getAccessToken: () => 'token-old',
      onUnauthorized: () => {
        unauthorizedCalls += 1
      },
      refresh: async () => {
        refreshCalls += 1
        return 'token-new'
      },
    })

    const harness = stubFetch((call) =>
      call === 1
        ? new Response(envelope(1002, '未登录或 token 已过期'), { status: 401 })
        : streamOk(),
    )

    let finishReason = ''
    await streamChat({
      body: BODY,
      accessToken: 'token-old',
      callbacks: {
        onEnd: (data) => {
          finishReason = data.finish_reason
        },
      },
    })

    expect(harness.fetchCount()).toBe(2)
    expect(refreshCalls).toBe(1)
    expect(harness.auths[0]).toBe('Bearer token-old')
    expect(harness.auths[1]).toBe('Bearer token-new')
    expect(finishReason).toBe('stop')
    // 已成功续期，不应把用户登出
    expect(unauthorizedCalls).toBe(0)
  })

  it('刷新失败：清会话并抛出 1002，且不重放', async () => {
    let unauthorizedCalls = 0
    configureHttpAuth({
      getAccessToken: () => 'token-old',
      onUnauthorized: () => {
        unauthorizedCalls += 1
      },
      refresh: async () => null,
    })
    const harness = stubFetch(
      () => new Response(envelope(1002, '未登录或 token 已过期'), { status: 401 }),
    )

    await expect(
      streamChat({ body: BODY, accessToken: 'token-old', callbacks: {} }),
    ).rejects.toMatchObject({ code: 1002 })

    expect(harness.fetchCount()).toBe(1)
    expect(unauthorizedCalls).toBe(1)
  })

  it('重放后仍是 401：清会话（与拦截器一致，避免无限重试）', async () => {
    let unauthorizedCalls = 0
    configureHttpAuth({
      getAccessToken: () => 'token-old',
      onUnauthorized: () => {
        unauthorizedCalls += 1
      },
      refresh: async () => 'token-new',
    })
    const harness = stubFetch(
      () => new Response(envelope(1002, '未登录或 token 已过期'), { status: 401 }),
    )

    await expect(
      streamChat({ body: BODY, accessToken: 'token-old', callbacks: {} }),
    ).rejects.toMatchObject({ code: 1002 })

    expect(harness.fetchCount()).toBe(2)
    expect(unauthorizedCalls).toBe(1)
  })

  it('非 401 失败不触发刷新：3004 原样抛出，供气泡展示「去设置」', async () => {
    let refreshCalls = 0
    configureHttpAuth({
      getAccessToken: () => null,
      onUnauthorized: () => undefined,
      refresh: async () => {
        refreshCalls += 1
        return null
      },
    })
    const harness = stubFetch(
      () => new Response(envelope(3004, '尚未配置大模型，请先在设置中完成配置'), { status: 503 }),
    )

    await expect(
      streamChat({ body: BODY, accessToken: null, callbacks: {} }),
    ).rejects.toMatchObject({ code: 3004 })

    expect(harness.fetchCount()).toBe(1)
    expect(refreshCalls).toBe(0)
  })
})
